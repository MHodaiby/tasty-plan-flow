import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/menus")({
  head: () => ({ meta: [{ title: "Weekly Menus — Sage Table" }, { name: "description", content: "Weekly Menus" }, { property: "og:title", content: "Weekly Menus — Sage Table" }, { property: "og:description", content: "Weekly Menus" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Weekly Menus" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
