import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "My Subscription — Sage Table" }, { name: "description", content: "My Subscription" }, { property: "og:title", content: "My Subscription — Sage Table" }, { property: "og:description", content: "My Subscription" }] }),
  component: () => (
    <AppShell variant="customer">
      <PageHeader title="My Subscription" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
