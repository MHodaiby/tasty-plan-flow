import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DayPicker } from "@/components/DayPicker";
import { needsSubscriptionReview, subscriptionDaysSchema } from "@/lib/subscription-rules";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useRefresh, type Profile, type Subscription } from "@/lib/data";
import { daysList, defaultEndDate, errMsg, fmtDateTime, fmtShort, toISODate, type SubStatus } from "@/lib/format";

export function SubscriptionAdminCard({ sub }: { sub: Subscription & { profiles: Profile | null } }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState([...sub.default_days]);
  const review = needsSubscriptionReview(sub);
  const validDays = subscriptionDaysSchema.safeParse(days).success;
  const daysChanged = days.join() !== sub.default_days.join();
  const today = toISODate(new Date());
  const [f, setF] = useState({
    start: sub.start_date ?? today, end: sub.end_date ?? defaultEndDate(sub.start_date ?? today, sub.billing_period),
    amount: "", reference: "", notes: sub.admin_notes ?? "",
  });

  async function update(patch: TablesUpdate<"subscriptions">, msg: string) {
    if (daysChanged && !validDays) { toast.error("Please select between 2 and 5 days."); return; }
    const { error } = await supabase.from("subscriptions").update({ ...patch, ...(daysChanged ? { default_days: [...days].sort((a, b) => a - b), days_per_week: days.length } : {}) }).eq("id", sub.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(msg); setOpen(false); refresh();
  }
  async function activate() {
    if (!validDays) { toast.error("Review subscription days before activation."); return; }
    if (!f.start || !f.end || f.end < f.start) { toast.error("Choose a valid start and end date"); return; }
    const { data } = await supabase.auth.getUser();
    if (!data.user) { toast.error("Please sign in again."); return; }
    const pay = await supabase.from("payments").insert({ subscription_id: sub.id, user_id: sub.user_id, amount: f.amount ? Number(f.amount) : null, reference: f.reference || null, recorded_by: data.user.id });
    if (pay.error) { toast.error(errMsg(pay.error)); return; }
    await update({ status: "active", start_date: f.start, end_date: f.end, payment_received_at: new Date().toISOString(), admin_notes: f.notes || null }, "Payment recorded and subscription activated");
  }
  const setStatus = (status: SubStatus) => update({ status }, "Status updated");

  return (
    <Panel className="text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold">{sub.profiles?.full_name}</p><p className="text-muted-foreground">{sub.profiles?.email} · {sub.profiles?.phone}</p></div>
        <StatusBadge status={sub.status} />
      </div>
      <p className="mt-3 capitalize">{sub.billing_period} · {sub.days_per_week} days · {daysList(sub.default_days)}</p>
      {review && <p role="alert" className="mt-2 text-destructive">Administrator review needed: this plan does not meet the 2–5 distinct days, Sunday–Thursday rule. Original days are preserved. Confirm revised days with the customer before saving.</p>}
      <p className="text-muted-foreground">{fmtShort(sub.start_date)} – {fmtShort(sub.end_date)} · requested {fmtDateTime(sub.created_at)}</p>
      {sub.admin_notes && <p className="mt-1 italic text-muted-foreground">{sub.admin_notes}</p>}

      {open ? (
        <div className="mt-4 grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Subscription days · {days.length} days per week</Label>
            {days.some((d) => d > 4 || d < 0) && <Button variant="outline" onClick={() => setDays(days.filter((d) => d >= 0 && d <= 4))}>Remove legacy weekend days</Button>}
            <DayPicker value={days} onChange={setDays} />
            {!validDays && <p className="text-destructive">Please select between 2 and 5 distinct days from Sunday to Thursday.</p>}
          </div>
          <div className="space-y-1"><Label>Start date</Label><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value, end: defaultEndDate(e.target.value, sub.billing_period) })} /></div>
          <div className="space-y-1"><Label>End date</Label><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          {sub.status === "pending_payment" && <>
            <div className="space-y-1"><Label>Amount paid (SAR)</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Payment reference</Label><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
          </>}
          <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="flex gap-2 sm:col-span-2">
            {sub.status === "pending_payment"
              ? <Button className="rounded-full" disabled={!validDays} onClick={activate}>Mark paid &amp; activate</Button>
              : <Button className="rounded-full" onClick={() => update({ start_date: f.start, end_date: f.end, admin_notes: f.notes || null }, "Saved")}>Save</Button>}
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>{sub.status === "pending_payment" ? "Record payment" : "Edit subscription"}</Button>
          {sub.status === "active" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus("paused")}>Pause</Button>}
          {sub.status === "paused" && <Button size="sm" variant="outline" disabled={review} className="rounded-full" onClick={() => setStatus("active")}>Resume</Button>}
          {["active", "paused"].includes(sub.status) && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus("expired")}>Expire</Button>}
          {sub.status !== "cancelled" && <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => confirm("Cancel this subscription?") && setStatus("cancelled")}>Cancel</Button>}
        </div>
      )}
    </Panel>
  );
}
