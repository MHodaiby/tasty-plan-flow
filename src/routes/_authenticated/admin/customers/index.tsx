import { createFileRoute } from "@tanstack/react-router";
import { CustomersWorkspace } from "@/features/admin-customers/CustomersWorkspace";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  head: () => ({
    meta: [{ title: "Customers & Subscriptions — Oui Chef" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: CustomersWorkspace,
});
