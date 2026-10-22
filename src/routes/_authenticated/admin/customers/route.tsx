import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersLayout,
});

function CustomersLayout() {
  return (
    <AppShell variant="admin">
      <Outlet />
    </AppShell>
  );
}
