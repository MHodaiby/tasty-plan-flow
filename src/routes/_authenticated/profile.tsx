import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Empty, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Sage Table" }, { name: "description", content: "Profile" }, { property: "og:title", content: "Profile — Sage Table" }, { property: "og:description", content: "Profile" }] }),
  component: () => (
    <AppShell variant="customer">
      <PageHeader title="Profile" />
      <Empty>This screen hasn't been built yet.</Empty>
    </AppShell>
  ),
});
