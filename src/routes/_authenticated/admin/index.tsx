import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Sage Table" }, { name: "description", content: "Admin Dashboard" }, { property: "og:title", content: "Admin Dashboard — Sage Table" }, { property: "og:description", content: "Admin Dashboard" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Admin Dashboard" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
