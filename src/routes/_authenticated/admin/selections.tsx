import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/selections")({
  head: () => ({ meta: [{ title: "Meal Selections — Sage Table" }, { name: "description", content: "Meal Selections" }, { property: "og:title", content: "Meal Selections — Sage Table" }, { property: "og:description", content: "Meal Selections" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Meal Selections" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
