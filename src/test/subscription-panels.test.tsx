import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewSubscriptionPanel } from "@/features/admin-customers/SubscriptionForms";
import { SubscriptionEditor } from "@/features/admin-customers/CustomerEditors";
import type { Subscription } from "@/lib/data";
const mocks = vi.hoisted(() => ({ create: vi.fn(), pay: vi.fn() }));
vi.mock("@/features/admin-customers/subscription-actions", () => ({
  createSubscriptionRequest: mocks.create,
  recordPaymentAndActivate: mocks.pay,
}));
const sub: Subscription = {
  id: "history",
  user_id: "customer",
  billing_period: "monthly",
  default_days: [0, 2, 4],
  days_per_week: 3,
  status: "expired",
  start_date: "2026-01-01",
  end_date: "2026-01-30",
  admin_notes: null,
  payment_received_at: null,
  created_at: "2026-01-01",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ id: "new-request", created: true });
  mocks.pay.mockResolvedValue(undefined);
});
afterEach(cleanup);
describe("Subscription panel actions", () => {
  it("offers Add subscription and creates a pending-payment request", async () => {
    const onCreated = vi.fn();
    render(
      <NewSubscriptionPanel
        userId="customer"
        onSaved={vi.fn().mockResolvedValue(undefined)}
        onCreated={onCreated}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add subscription" }));
    expect(screen.getByRole("button", { name: "Create request" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Sun" }));
    fireEvent.click(screen.getByRole("button", { name: "Tue" }));
    fireEvent.click(screen.getByRole("button", { name: "Create request" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith("customer", "weekly", [0, 2], ""),
    );
    expect(onCreated).toHaveBeenCalledWith("new-request");
  });
  it("renews from a prefilled copy and preserves the expired record", async () => {
    render(
      <SubscriptionEditor
        subscription={sub}
        customerName="Customer"
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Renew subscription" }));
    const form = within(screen.getByRole("form", { name: "Renew subscription request" }));
    expect(form.getByRole("combobox")).toHaveValue("monthly");
    expect(form.getByRole("button", { name: "Tue" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(form.getByRole("button", { name: "Create request" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith("customer", "monthly", [0, 2, 4], ""),
    );
    expect(sub.status).toBe("expired");
    expect(sub.end_date).toBe("2026-01-30");
  });
  it("shows Record payment for pending requests and closes it on cancel", () => {
    render(
      <SubscriptionEditor
        subscription={{ ...sub, status: "pending_payment" }}
        customerName="Customer"
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(screen.getByRole("form", { name: "Record subscription payment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount paid (EGP)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.pay).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument();
  });
  it("keeps payment activation disabled for incompatible legacy requests", () => {
    render(
      <SubscriptionEditor
        subscription={{ ...sub, status: "pending_payment", default_days: [0, 5] }}
        customerName="Customer"
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
  });
  it("offers renewal for a legacy cancelled record with an Expired label", () => {
    render(
      <SubscriptionEditor
        subscription={{ ...sub, status: "cancelled" }}
        customerName="Customer"
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByText("Cancelled")).not.toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renew subscription" })).toBeInTheDocument();
  });
});
