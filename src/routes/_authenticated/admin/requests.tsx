import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, Loading, PageHeader } from "@/components/AppShell";
import { SubscriptionAdminCard } from "@/components/SubscriptionAdminCard";
import { useAllSubs } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({ meta: [{ title: "Subscription Requests — Sage Table" }, { name: "description", content: "Requests awaiting payment." }, { property: "og:title", content: "Subscription Requests — Sage Table" }, { property: "og:description", content: "Requests awaiting payment." }] }),
  component: Requests,
});

function Requests() {
  const subs = useAllSubs();
  if (subs.isLoading) return <AppShell variant="admin"><Loading /></AppShell>;
  const list = (subs.data ?? []).filter((s) => s.status === "pending_payment");
  return (
    <AppShell variant="admin">
      <PageHeader title="Subscription Requests" subtitle="Send the payment link, then record the payment to activate." />
      {!list.length ? <Empty>No pending requests.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{list.map((s) => <SubscriptionAdminCard key={s.id} sub={s} />)}</div>}
    </AppShell>
  );
}
