import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MealPlanner } from "@/features/admin-customers/MealPlanner";

const mocks = vi.hoisted(() => ({ upsert: vi.fn(), week: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: mocks.success } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ upsert: mocks.upsert }) },
}));
vi.mock("@/lib/data", () => ({
  usePublishedMenus: () => ({
    data: [
      {
        id: "menu-one",
        week_start: "2026-11-08",
        weekly_menu_items: [
          {
            meals: {
              id: "meal-one",
              name: "Example meal",
              is_active: true,
              image_url: null,
              calories: 500,
              description: "Example description",
            },
          },
        ],
      },
      {
        id: "menu-two",
        week_start: "2026-11-15",
        weekly_menu_items: [
          {
            meals: {
              id: "meal-two",
              name: "Following week meal",
              is_active: true,
              image_url: null,
              calories: 500,
              description: "Example description",
            },
          },
        ],
      },
    ],
    isPending: false,
  }),
  useWeeklySelection: mocks.week,
}));
const sub = {
  id: "sub-one",
  user_id: "customer-one",
  billing_period: "weekly" as const,
  days_per_week: 2,
  default_days: [0, 2],
  status: "active" as const,
  start_date: "2026-11-08",
  end_date: "2026-11-14",
  payment_received_at: null,
  admin_notes: null,
  created_at: "2026-11-01",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.week.mockReturnValue({
    data: { dates: ["2026-11-08", "2026-11-10"], sels: {}, deadline: "2099-11-01T12:00:00Z" },
    isPending: false,
  });
});
afterEach(cleanup);
function planner(subscription = sub) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MealPlanner subscription={subscription} />
    </QueryClientProvider>,
  );
}
describe("Admin meal chooser", () => {
  it("switches the published week and preselects the date chosen in that week", () => {
    mocks.week.mockImplementation((_sub, menu) => ({
      data: {
        dates:
          menu?.week_start === "2026-11-15"
            ? ["2026-11-15", "2026-11-17"]
            : ["2026-11-08", "2026-11-10"],
        sels: {},
        deadline: "2099-11-01T12:00:00Z",
      },
      isPending: false,
    }));
    planner({ ...sub, end_date: "2026-11-21" });
    fireEvent.click(screen.getByRole("button", { name: /Choose delivery date/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tuesday, November 17/ }));
    expect(screen.getByRole("button", { name: "Tue 17/11" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Choose delivery date, 17 Nov 2026" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tue 10/11" })).not.toBeInTheDocument();
  });
  it("preselects a chosen delivery date and disables weekends and unsubscribed days", () => {
    planner();
    expect(screen.getByText("8 Nov 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Choose delivery date/ }));
    expect(screen.getByRole("button", { name: /Friday, November 13/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Saturday, November 14/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Monday, November 9/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Tuesday, November 10/ }));
    expect(screen.getByRole("button", { name: "Tue 10/11" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Choose delivery date, 10 Nov 2026" }),
    ).toBeInTheDocument();
  });
  it("hides calendar controls when no weeks overlap the subscription", () => {
    planner({ ...sub, start_date: "2027-01-01", end_date: "2027-01-31" });
    expect(screen.queryByRole("button", { name: /Choose delivery date/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No published weeks");
  });
  it("saves a meal against the selected subscription and delivery date", async () => {
    planner();
    fireEvent.click(screen.getByRole("button", { name: "Tue 10/11" }));
    fireEvent.click(screen.getByRole("button", { name: /Example meal/ }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Meal selection saved"));
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        subscription_id: "sub-one",
        user_id: "customer-one",
        menu_id: "menu-one",
        delivery_date: "2026-11-10",
        meal_id: "meal-one",
      },
      { onConflict: "subscription_id,delivery_date" },
    );
  });
  it("blocks meal choices for incompatible legacy delivery days", () => {
    planner({ ...sub, default_days: [0, 5] });
    expect(screen.getByRole("status")).toHaveTextContent("requires review");
    expect(screen.queryByRole("button", { name: /Example meal/ })).not.toBeInTheDocument();
    expect(mocks.week).toHaveBeenCalledWith(undefined, undefined);
  });
  it("requires confirmation for an admin change after the deadline", () => {
    mocks.week.mockReturnValue({
      data: { dates: ["2026-11-08"], sels: {}, deadline: "2000-01-01T12:00:00Z" },
      isPending: false,
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    planner();
    fireEvent.click(screen.getByRole("button", { name: /Example meal/ }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(mocks.upsert).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
