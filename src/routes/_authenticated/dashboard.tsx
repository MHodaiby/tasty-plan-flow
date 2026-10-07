import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Sage Table" }, { name: "description", content: "Dashboard" }, { property: "og:title", content: "Dashboard — Sage Table" }, { property: "og:description", content: "Dashboard" }] }),
  component: () => (
    <AppShell variant="customer">
      <PageHeader title="Dashboard" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
