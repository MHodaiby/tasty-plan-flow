import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Loading, PageHeader, Panel } from "@/components/AppShell";
import { useAllSubs, useMenus, useProfiles } from "@/lib/data";
import { weekStartOf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Sage Table" }, { name: "description", content: "Admin overview." }, { property: "og:title", content: "Admin — Sage Table" }, { property: "og:description", content: "Admin overview." }] }),
  component: AdminHome,
});

function AdminHome() {
  const subs = useAllSubs(); const profiles = useProfiles(); const menus = useMenus();
  if (subs.isLoading || profiles.isLoading || menus.isLoading) return <AppShell variant="admin"><Loading /></AppShell>;
  const s = subs.data ?? [];
  const upcoming = (menus.data ?? []).filter((m) => m.week_start >= weekStartOf());
  const stats = [
    { label: "Pending requests", value: s.filter((x) => x.status === "pending_payment").length, to: "/admin/requests" },
    { label: "Active subscriptions", value: s.filter((x) => x.status === "active").length, to: "/admin/subscriptions" },
    { label: "Customers", value: profiles.data?.length ?? 0, to: "/admin/customers" },
    { label: "Upcoming menus published", value: `${upcoming.filter((m) => m.is_published).length}/${upcoming.length}`, to: "/admin/menus" },
  ];
  return (
    <AppShell variant="admin">
      <PageHeader title="Admin dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((x) => (
          <Link key={x.label} to={x.to}><Panel className="transition hover:ring-2 hover:ring-primary/40"><p className="text-sm text-muted-foreground">{x.label}</p><p className="mt-2 font-display text-4xl font-semibold">{x.value}</p></Panel></Link>
        ))}
      </div>
    </AppShell>
  );
}
