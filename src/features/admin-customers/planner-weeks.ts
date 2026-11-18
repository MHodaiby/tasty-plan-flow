import type { Subscription } from "@/lib/data";
import { addDays } from "@/lib/format";
import { subscriptionDaysSchema } from "@/lib/subscription-rules";

type PlannerMenu = {
  week_start: string;
  weekly_menu_items: { meals: { is_active: boolean } | null }[];
};

export function plannerDates(menu: PlannerMenu, sub: Subscription): string[] {
  if (!menu.weekly_menu_items.some((item) => item.meals?.is_active)) return [];
  return sub.default_days
    .filter((day) => day >= 0 && day <= 4)
    .map((day) => addDays(menu.week_start, day))
    .filter(
      (date) =>
        !!sub.start_date && date >= sub.start_date && (!sub.end_date || date <= sub.end_date),
    )
    .sort();
}

export function eligiblePlannerWeeks<T extends PlannerMenu>(
  menus: T[],
  sub: Subscription | undefined,
): T[] {
  if (
    !sub ||
    sub.status !== "active" ||
    !sub.start_date ||
    !subscriptionDaysSchema.safeParse(sub.default_days).success ||
    sub.days_per_week !== sub.default_days.length
  )
    return [];
  return menus.filter((menu) => plannerDates(menu, sub).length > 0);
}
