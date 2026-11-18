import { describe, expect, it } from "vitest";
import { eligiblePlannerWeeks } from "@/features/admin-customers/planner-weeks";
import type { Subscription } from "@/lib/data";
const sub: Subscription = {
  id: "sub",
  user_id: "user",
  billing_period: "weekly",
  days_per_week: 2,
  default_days: [0, 2],
  status: "active",
  start_date: "2026-11-01",
  end_date: "2026-11-14",
  payment_received_at: null,
  admin_notes: null,
  created_at: "2026-11-01",
};
const menu = (week_start: string, is_active = true) => ({
  week_start,
  weekly_menu_items: [{ meals: { is_active } }],
});
describe("Eligible published weeks", () => {
  it("includes past overlapping weeks but excludes weeks with no active meals", () => {
    const menus = [
      menu("2026-11-01"),
      menu("2026-11-08"),
      menu("2026-11-15"),
      menu("2026-11-08", false),
    ];
    expect(eligiblePlannerWeeks(menus, sub)).toEqual(menus.slice(0, 2));
  });
  it("requires a subscribed delivery date inside a partial subscription week", () => {
    expect(
      eligiblePlannerWeeks([menu("2026-11-08")], { ...sub, start_date: "2026-11-11" }),
    ).toEqual([]);
    expect(
      eligiblePlannerWeeks([menu("2026-11-08")], {
        ...sub,
        start_date: "2026-11-10",
        end_date: "2026-11-10",
      }),
    ).toHaveLength(1);
  });
  it("does not expose weeks for paused or incompatible legacy subscriptions", () => {
    expect(eligiblePlannerWeeks([menu("2026-11-08")], { ...sub, status: "paused" })).toEqual([]);
    expect(eligiblePlannerWeeks([menu("2026-11-08")], { ...sub, default_days: [0, 5] })).toEqual(
      [],
    );
  });
});
