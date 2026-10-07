import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({ meta: [{ title: "Subscription Requests — Sage Table" }, { name: "description", content: "Subscription Requests" }, { property: "og:title", content: "Subscription Requests — Sage Table" }, { property: "og:description", content: "Subscription Requests" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Subscription Requests" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
