import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Sage Table" }, { name: "description", content: "Subscriptions" }, { property: "og:title", content: "Subscriptions — Sage Table" }, { property: "og:description", content: "Subscriptions" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Subscriptions" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
