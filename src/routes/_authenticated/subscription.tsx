import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Empty, Loading, PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { DayPicker } from "@/components/DayPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMySubs, useRefresh } from "@/lib/data";
import { daysList, errMsg, fmtShort, OPEN_STATUSES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { needsSubscriptionReview, subscriptionRequestSchema } from "@/lib/subscription-rules";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "My Subscription — Oui Chef" }, { name: "description", content: "View or request your meal subscription." }, { property: "og:title", content: "My Subscription — Oui Chef" }, { property: "og:description", content: "View or request your meal subscription." }] }),
  component: SubscriptionPage,
});

function Choice<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <Button type="button" variant="outline" aria-pressed={value === o.v} key={String(o.v)} onClick={() => onChange(o.v)}
          className={cn("h-auto justify-start rounded-2xl border p-4 text-left text-sm font-semibold transition", value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-secondary")}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function SubscriptionPage() {
  const subs = useMySubs();
  const refresh = useRefresh();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [busy, setBusy] = useState(false);
  const parsed = subscriptionRequestSchema.safeParse({ billing_period: period, default_days: days });
  const count = days.length;
  const open = subs.data?.find((s) => OPEN_STATUSES.includes(s.status));

  async function submit() {
    if (!parsed.success) { toast.error("Please select between 2 and 5 days."); return; }
    setBusy(true);
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Please sign in to send your request.");
      const { error } = await supabase.from("subscriptions").insert({ user_id: data.user.id, ...parsed.data, status: "pending_payment" });
      if (error) throw error;
      toast.success("Your Oui Chef request is sent! We'll contact you with a payment link.");
      refresh();
    } catch (error) { toast.error(errMsg(error)); }
    finally { setBusy(false); }
  }

  if (subs.isLoading) return <AppShell variant="customer"><Loading /></AppShell>;
  return (
    <AppShell variant="customer">
      <PageHeader title="My Subscription" />
      <div className="grid gap-5 lg:grid-cols-2">
        {!open && (
          <Panel>
            <h2 className="text-xl font-semibold">Build Your Weekly Plan</h2>
            <p className="mt-2 text-sm text-muted-foreground">Choose 2 to 5 days from Sunday to Thursday to create a plan that fits your routine.</p>
            <div className="mt-5 space-y-5">
              <div className="space-y-2"><Label>1. Choose your billing period</Label>
                <Choice value={period} onChange={setPeriod} options={[{ v: "weekly", label: "Weekly" }, { v: "monthly", label: "Monthly" }]} /></div>
              <div className="space-y-2"><Label>2. Choose your subscription days</Label><DayPicker value={days} onChange={setDays} />
                <p aria-live="polite" className={cn("text-sm", parsed.success ? "text-primary" : "text-destructive")}>{count < 2 ? "Choose at least 2 days" : `${count} days per week selected`}</p>
                {!parsed.success && <p role="alert" className="text-sm text-destructive">Please select between 2 and 5 days.</p>}
              </div>
              <div className="space-y-2 border-t border-border pt-4"><Label>3. Review and submit</Label>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Billing period</dt><dd className="capitalize">{period}</dd></div>
                  <div><dt className="text-muted-foreground">Subscription days</dt><dd>{daysList(days) || "No days selected"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Weekly plan</dt><dd>{count} days per week</dd></div>
                </dl>
              </div>
              <Button onClick={submit} disabled={busy || !parsed.success} className="w-full rounded-full" size="lg">{busy ? "Sending…" : "Send request"}</Button>
              <p className="text-xs text-muted-foreground">No payment now. We'll send a payment link and activate your plan once it's paid.</p>
            </div>
          </Panel>
        )}
        <Panel className={cn(!open && "lg:order-first")}>
          <h2 className="text-xl font-semibold">History</h2>
          <div className="mt-4 space-y-3">
            {!subs.data?.length ? <Empty>No subscriptions yet.</Empty> : subs.data.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-background/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold capitalize">{s.billing_period} · {s.days_per_week} days</span><StatusBadge status={s.status} /></div>
                <p className="mt-2 text-muted-foreground">{daysList(s.default_days)}</p>
                 {needsSubscriptionReview(s) && <p className="mt-2 text-destructive">Administrator review needed. Our subscription days run from Sunday to Thursday; your original days are preserved.</p>}
                <p className="text-muted-foreground">{fmtShort(s.start_date)} – {fmtShort(s.end_date)} · requested {fmtShort(s.created_at.slice(0, 10))}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
