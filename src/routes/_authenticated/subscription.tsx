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

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "My Subscription — Sage Table" }, { name: "description", content: "View or request your meal subscription." }, { property: "og:title", content: "My Subscription — Sage Table" }, { property: "og:description", content: "View or request your meal subscription." }] }),
  component: SubscriptionPage,
});

function Choice<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button type="button" key={String(o.v)} onClick={() => onChange(o.v)}
          className={cn("rounded-2xl border p-4 text-left text-sm font-semibold transition", value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-secondary")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SubscriptionPage() {
  const subs = useMySubs();
  const refresh = useRefresh();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [count, setCount] = useState<3 | 5>(5);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [busy, setBusy] = useState(false);
  const open = subs.data?.find((s) => OPEN_STATUSES.includes(s.status));

  async function submit() {
    if (days.length !== count) return toast.error(`Choose exactly ${count} delivery days`);
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from("subscriptions").insert({ user_id: data.user!.id, billing_period: period, days_per_week: count, default_days: [...days].sort(), status: "pending_payment" });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Request sent! We'll contact you with a payment link.");
    refresh();
  }

  if (subs.isLoading) return <AppShell variant="customer"><Loading /></AppShell>;
  return (
    <AppShell variant="customer">
      <PageHeader title="My Subscription" />
      <div className="grid gap-5 lg:grid-cols-2">
        {!open && (
          <Panel>
            <h2 className="text-xl font-semibold">Request a subscription</h2>
            <div className="mt-5 space-y-5">
              <div className="space-y-2"><Label>Billing period</Label>
                <Choice value={period} onChange={setPeriod} options={[{ v: "weekly", label: "Weekly" }, { v: "monthly", label: "Monthly" }]} /></div>
              <div className="space-y-2"><Label>Meals per week</Label>
                <Choice value={count} onChange={(v) => { setCount(v); setDays(days.slice(0, v)); }} options={[{ v: 3, label: "3 days" }, { v: 5, label: "5 days" }]} /></div>
              <div className="space-y-2"><Label>Delivery days ({days.length}/{count})</Label><DayPicker value={days} max={count} onChange={setDays} /></div>
              <Button onClick={submit} disabled={busy} className="w-full rounded-full" size="lg">{busy ? "Sending…" : "Send request"}</Button>
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
                <p className="text-muted-foreground">{fmtShort(s.start_date)} – {fmtShort(s.end_date)} · requested {fmtShort(s.created_at.slice(0, 10))}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
