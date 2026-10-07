import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/meals")({
  head: () => ({ meta: [{ title: "Meals — Sage Table" }, { name: "description", content: "Meals" }, { property: "og:title", content: "Meals — Sage Table" }, { property: "og:description", content: "Meals" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Meals" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
