import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Empty, Loading, PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useMe, useMySubs } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { daysList, fmtDay, fmtShort } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => {
    if (context.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Dashboard — Oui Chef" }, { name: "description", content: "Your meal subscription at a glance." }, { property: "og:title", content: "Dashboard — Oui Chef" }, { property: "og:description", content: "Your meal subscription at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const subs = useMySubs();
  const sub = subs.data?.find((s) => s.status === "active") ?? subs.data?.[0];
  const upcoming = useQuery({
    queryKey: ["upcoming", sub?.id],
    enabled: !!sub && sub.status === "active",
    queryFn: async () => {
      if (!sub) return [];
      const { data, error } = await supabase.from("meal_selections").select("delivery_date, meals(name)").eq("subscription_id", sub.id)
        .gte("delivery_date", new Date().toISOString().slice(0, 10)).order("delivery_date").limit(7);
      if (error) throw error;
      return data as unknown as { delivery_date: string; meals: { name: string } | null }[];
    },
  });

  if (me.isLoading || subs.isLoading) return <AppShell variant="customer"><Loading /></AppShell>;
  return (
    <AppShell variant="customer">
      <PageHeader title={`Hello, ${me.data?.full_name.split(" ")[0] || "there"}`} subtitle="Here's your meal plan at a glance." />
      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <h2 className="text-xl font-semibold">Subscription</h2>
          {!sub ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">You don't have a subscription yet.</p>
              <Button asChild className="rounded-full"><Link to="/subscription">Request a subscription</Link></Button>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <StatusBadge status={sub.status} />
              <p><span className="text-muted-foreground">Plan:</span> {sub.days_per_week} days / week, billed {sub.billing_period}</p>
              <p><span className="text-muted-foreground">Days:</span> {daysList(sub.default_days)}</p>
              <p><span className="text-muted-foreground">Period:</span> {fmtShort(sub.start_date)} – {fmtShort(sub.end_date)}</p>
              {sub.status === "pending_payment" && <p className="rounded-2xl bg-accent p-3 text-accent-foreground">We'll send you a payment link. Your subscription starts once payment is received.</p>}
            </div>
          )}
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming meals</h2>
            {sub?.status === "active" && <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/choose-meals">Choose meals</Link></Button>}
          </div>
          <div className="mt-4">
            {sub?.status !== "active" ? <Empty>Meals appear here once your subscription is active.</Empty>
              : !upcoming.data?.length ? <Empty>No meals chosen yet. Pick this week's meals.</Empty>
              : <ul className="divide-y divide-border">{upcoming.data.map((u) => (
                  <li key={u.delivery_date} className="flex justify-between gap-3 py-2.5 text-sm"><span className="text-muted-foreground">{fmtDay(u.delivery_date)}</span><span className="font-medium">{u.meals?.name}</span></li>
                ))}</ul>}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
