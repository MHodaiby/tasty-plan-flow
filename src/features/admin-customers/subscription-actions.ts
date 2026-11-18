import { supabase } from "@/integrations/supabase/client";
import { subscriptionRequestSchema, subscriptionDaysSchema } from "@/lib/subscription-rules";
import { OPEN_STATUSES, toISODate } from "@/lib/format";
import type { Subscription } from "@/lib/data";

export async function createSubscriptionRequest(
  userId: string,
  period: "weekly" | "monthly",
  days: number[],
  notes: string,
) {
  const request = subscriptionRequestSchema.parse({ billing_period: period, default_days: days });
  const existing = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", OPEN_STATUSES)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { id: existing.data.id, created: false };
  // The existing database unique index also prevents concurrent open requests.
  const result = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      ...request,
      status: "pending_payment",
      admin_notes: notes.trim() || null,
    })
    .select("id")
    .single();
  if (result.error) throw result.error;
  return { id: result.data.id, created: true };
}

export async function recordPaymentAndActivate(
  sub: Subscription,
  form: { start: string; end: string; amount: string; reference: string },
) {
  subscriptionDaysSchema.parse(sub.default_days);
  if (!form.start || !form.end || form.end < form.start || form.end < toISODate(new Date()))
    throw new Error("Choose a valid subscription period ending today or later.");
  const amount = form.amount.trim() ? Number(form.amount) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount < 0))
    throw new Error("Enter a valid payment amount.");
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("Please sign in again.");
  const current = await supabase.from("subscriptions").select("status").eq("id", sub.id).single();
  if (current.error) throw current.error;
  if (current.data.status !== "pending_payment")
    throw new Error("This request is no longer pending payment. Refresh its details.");
  // Reuse a payment left by an earlier activation failure, including after reload.
  // This preserves the original two-write flow without silently recording it twice.
  const previous = await supabase
    .from("payments")
    .select("id, received_at")
    .eq("subscription_id", sub.id)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previous.error) throw previous.error;
  let receivedAt = previous.data?.received_at;
  if (!previous.data) {
    const payment = await supabase
      .from("payments")
      .insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        amount,
        currency: "EGP",
        reference: form.reference.trim() || null,
        recorded_by: auth.data.user.id,
      })
      .select("received_at")
      .single();
    if (payment.error) throw payment.error;
    receivedAt = payment.data.received_at;
  }
  const activation = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      start_date: form.start,
      end_date: form.end,
      payment_received_at: receivedAt!,
      default_days: [...sub.default_days].sort((a, b) => a - b),
      days_per_week: sub.default_days.length,
    })
    .eq("id", sub.id)
    .eq("status", "pending_payment")
    .select("id")
    .single();
  if (activation.error)
    throw new Error(
      "Payment is recorded, but activation failed. Retry to complete activation without recording another payment.",
    );
}
