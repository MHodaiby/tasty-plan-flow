import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [{ title: "Customers — Sage Table" }, { name: "description", content: "Customers" }, { property: "og:title", content: "Customers — Sage Table" }, { property: "og:description", content: "Customers" }] }),
  component: () => (
    <AppShell variant="admin">
      <PageHeader title="Customers" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
