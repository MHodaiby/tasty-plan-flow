import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersLayout,
});

function CustomersLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname.replace(/\/$/, "") === "/admin/customers") return <Outlet />;
  return (
    <AppShell variant="admin">
      <Outlet />
    </AppShell>
  );
}
