import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/choose-meals")({
  head: () => ({ meta: [{ title: "Choose Meals — Sage Table" }, { name: "description", content: "Choose Meals" }, { property: "og:title", content: "Choose Meals — Sage Table" }, { property: "og:description", content: "Choose Meals" }] }),
  component: () => (
    <AppShell variant="customer">
      <PageHeader title="Choose Meals" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
