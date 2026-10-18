import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Empty, Loading, PageHeader } from "@/components/AppShell";
import { SubscriptionAdminCard } from "@/components/SubscriptionAdminCard";
import { useAllSubs } from "@/lib/data";
import { STATUS_LABEL, type SubStatus } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Subscriptions — Oui Chef" }, { name: "description", content: "Manage all subscriptions." }, { property: "og:title", content: "Subscriptions — Oui Chef" }, { property: "og:description", content: "Manage all subscriptions." }] }),
  component: Subs,
});

function Subs() {
  const subs = useAllSubs();
  const [filter, setFilter] = useState<SubStatus | "all">("all");
  if (subs.isLoading) return <AppShell variant="admin"><Loading /></AppShell>;
  const list = (subs.data ?? []).filter((s) => filter === "all" || (s.status === filter));
  return (
    <AppShell variant="admin">
      <PageHeader title="Subscriptions" subtitle="Plans include 2–5 days from Sunday to Thursday. Review any flagged existing plans with the customer." />
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {(["all", ...Object.keys(STATUS_LABEL)] as (SubStatus | "all")[]).map((k) => (
          <Button variant="secondary" key={k} onClick={() => setFilter(k)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium", filter === k ? "bg-primary text-primary-foreground" : "bg-secondary")}>
            {k === "all" ? "All" : STATUS_LABEL[k]}
          </Button>
        ))}
      </div>
      {!list.length ? <Empty>No subscriptions here.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{list.map((s) => <SubscriptionAdminCard key={s.id} sub={s} />)}</div>}
    </AppShell>
  );
}
