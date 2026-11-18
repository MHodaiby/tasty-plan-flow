import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomersWorkspace } from "@/features/admin-customers/CustomersWorkspace";
import { SubscriptionEditor } from "@/features/admin-customers/CustomerEditors";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
  upsert: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: mocks.update, upsert: mocks.upsert }) },
}));
const alice = {
  id: "alice-id",
  full_name: "Alice Example",
  email: "alice@example.test",
  phone: "+201000000001",
  delivery_address: "Example address",
  created_at: "2026-11-01",
};
const bob = { ...alice, id: "bob-id", full_name: "Bob Example", email: "bob@example.test" };
const sub = {
  id: "sub-alice",
  user_id: alice.id,
  billing_period: "weekly" as const,
  days_per_week: 3,
  default_days: [0, 2, 4],
  status: "active" as const,
  start_date: "2026-11-08",
  end_date: "2026-11-14",
  payment_received_at: null,
  admin_notes: "Original note",
  created_at: "2026-11-01",
};
vi.mock("@/lib/data", () => ({
  useProfiles: () => ({ data: [alice, bob], isPending: false }),
  useAllSubs: () => ({ data: [sub], isPending: false }),
  useMe: () => ({ data: { full_name: "Admin Example", email: "admin@example.test" } }),
  usePublishedMenus: () => ({ data: [], isPending: false }),
  useWeeklySelection: () => ({ data: undefined }),
}));
function workspace(edit = true) {
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <CustomersWorkspace />
    </QueryClientProvider>,
  );
  if (edit) fireEvent.click(screen.getByRole("button", { name: "Edit personal details" }));
  return view;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
});
afterEach(cleanup);

describe("Customers and subscriptions workspace", () => {
  it("starts in view mode and cancel discards personal-detail edits", () => {
    workspace(false);
    expect(screen.getByRole("heading", { name: "Personal Details" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit personal details" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Unsaved name" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit personal details" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("Alice Example");
  });
  it("selects a customer from the status cell and displays the payment plan", () => {
    workspace();
    expect(screen.getByText(/3 days(?: \/ week)? · Weekly/)).toBeInTheDocument();
    const row = screen.getByRole("button", { name: /Bob Example/ }).closest("tr")!;
    fireEvent.click(row.querySelector(".aw-status-column")!);
    fireEvent.click(screen.getByRole("button", { name: "Edit personal details" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("Bob Example");
  });
  it("changes the selected customer and resets the profile form", () => {
    workspace();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Unsaved Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /Bob Example/ }));
    fireEvent.click(screen.getByRole("button", { name: "Edit personal details" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("Bob Example");
    expect(screen.getByText("This customer has no subscription.")).toBeInTheDocument();
  });
  it("searches by customer ID without replacing the selected profile", () => {
    workspace();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bob-id" } });
    expect(screen.queryByRole("button", { name: /Alice Example/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bob Example/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Alice Example");
  });
  it("persists profile edits only to the selected customer's record", async () => {
    workspace();
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+201000000099" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Customer details saved"));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ phone: "+201000000099" }));
    expect(mocks.eq).toHaveBeenCalledWith("id", "alice-id");
  });
  it("retains input and reports a failed save", async () => {
    mocks.eq.mockResolvedValue({ error: { message: "Save denied" } });
    workspace();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alice Edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Save denied"));
    expect(screen.getByLabelText("Full name")).toHaveValue("Alice Edited");
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("derives the subscription count from selected days and cancel restores the original", async () => {
    render(
      <SubscriptionEditor
        subscription={sub}
        customerName="Alice"
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit subscription" }));
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    expect(screen.getByLabelText("Plan")).toHaveTextContent("Weekly");
    expect(screen.queryByRole("combobox", { name: "Plan" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit subscription" }));
    expect(screen.getByRole("button", { name: "Mon" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    fireEvent.click(screen.getByRole("button", { name: "Save subscription" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ default_days: [0, 1, 2, 4], days_per_week: 4 }),
      ),
    );
    expect(screen.getByRole("button", { name: "Edit subscription" })).toBeInTheDocument();
  });
  it("flags historical invalid days and blocks an invalid replacement", () => {
    render(
      <SubscriptionEditor
        subscription={{ ...sub, default_days: [0, 5], days_per_week: 2 }}
        customerName="Alice"
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Requires review");
    fireEvent.click(screen.getByRole("button", { name: "Edit subscription" }));
    fireEvent.click(screen.getByRole("button", { name: "Tue" }));
    expect(screen.getByRole("button", { name: "Save subscription" })).toBeDisabled();
  });
  it("exposes the wireframe navigation through the mobile menu", () => {
    workspace();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      within(screen.getByRole("navigation", { name: "Mobile admin navigation" })).getByRole(
        "link",
        { name: "Meal Catalogue" },
      ),
    ).toHaveAttribute("href", "/admin/meals");
  });
  it("does not reactivate an invalid expired legacy plan through a date edit", async () => {
    render(
      <SubscriptionEditor
        subscription={{
          ...sub,
          status: "expired",
          default_days: [0, 5],
          days_per_week: 2,
          end_date: "2099-11-14",
        }}
        customerName="Alice"
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit subscription" }));
    fireEvent.click(screen.getByRole("button", { name: "Save subscription" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "Use Renew subscription to create a new request instead of extending this expired record.",
      ),
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
