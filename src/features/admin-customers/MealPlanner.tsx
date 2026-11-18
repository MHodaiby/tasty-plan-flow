import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePublishedMenus, useWeeklySelection, type Subscription } from "@/lib/data";
import { DAYS_SHORT, errMsg, parseDate, weekStartOf } from "@/lib/format";
import { subscriptionDaysSchema } from "@/lib/subscription-rules";
import { eligiblePlannerWeeks, plannerDates } from "./planner-weeks";
import { DeliveryCalendar } from "./DeliveryCalendar";

export function MealPlanner({ subscription }: { subscription: Subscription | undefined }) {
  const menus = usePublishedMenus(true);
  const queryClient = useQueryClient();
  const [menuId, setMenuId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string>();
  const [busy, setBusy] = useState(false);
  const eligibleMenus = eligiblePlannerWeeks(menus.data ?? [], subscription);
  const menu =
    eligibleMenus.find((menu) => menu.id === menuId) ??
    eligibleMenus.find((menu) => menu.week_start >= weekStartOf()) ??
    eligibleMenus.at(-1);
  const sub = subscription ? { ...subscription, profiles: null } : undefined;
  const validDays =
    !!subscription &&
    subscriptionDaysSchema.safeParse(subscription.default_days).success &&
    subscription.days_per_week === subscription.default_days.length;
  const week = useWeeklySelection(
    validDays && subscription?.status === "active" ? sub : undefined,
    menu,
  );
  const availableDates = subscription
    ? eligibleMenus.flatMap((menu) => plannerDates(menu, subscription)).sort()
    : [];
  const visibleDates =
    menu && subscription
      ? plannerDates(menu, subscription).filter((date) => week.data?.dates.includes(date))
      : [];
  const day = visibleDates.includes(selectedDate ?? "") ? selectedDate : visibleDates[0];
  const meals =
    menu?.weekly_menu_items.map((item) => item.meals).filter((meal) => meal?.is_active) ?? [];
  function selectCalendarDate(date: string) {
    if (!date) return;
    const start = weekStartOf(parseDate(date));
    const next = eligibleMenus.find((menu) => menu.week_start === start);
    if (!next || !availableDates.includes(date)) return;
    setMenuId(next.id);
    setSelectedDate(date);
  }
  async function pick(mealId: string) {
    if (!subscription || !menu || !day || busy || !validDays || subscription.status !== "active")
      return;
    if (
      week.data &&
      new Date() >= new Date(week.data.deadline) &&
      !window.confirm("The selection deadline has passed. Change this meal as an administrator?")
    )
      return;
    setBusy(true);
    try {
      const { error } = await supabase.from("meal_selections").upsert(
        {
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          menu_id: menu.id,
          delivery_date: day,
          meal_id: mealId,
        },
        { onConflict: "subscription_id,delivery_date" },
      );
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["week", subscription.id, menu.id] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming", subscription.id] }),
      ]);
      toast.success("Meal selection saved");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }
  let notice: ReactNode;
  if (!subscription) notice = "Select a customer with a subscription to choose meals.";
  else if (!validDays)
    notice =
      "This subscription requires review before selecting meals. Correct its delivery days first.";
  else if (subscription.status !== "active")
    notice = "Meal selection opens once this subscription is active.";
  else if (menus.isError || week.isError)
    notice = (
      <>
        Meal selections could not be loaded.
        <button
          className="aw-button"
          onClick={() => {
            void menus.refetch();
            void week.refetch();
          }}
        >
          Try again
        </button>
      </>
    );
  else if (menus.isPending || (menu && week.isPending)) notice = "Loading meal selections…";
  else if (!menu)
    notice = "No published weeks with meals overlap this subscription’s delivery days.";
  else if (!week.data?.dates.length)
    notice = "No deliveries for this subscription in the selected week.";
  return (
    <section className="aw-planner aw-panel" aria-label="Choose Meals">
      <h2>Choose Meals</h2>
      {notice ? (
        <div className="aw-notice" role="status">
          {notice}
        </div>
      ) : null}
      {menu && (
        <div className="aw-planner-layout">
          <div className="aw-day-rail">
            <DeliveryCalendar
              dates={availableDates}
              selected={
                selectedDate && availableDates.includes(selectedDate)
                  ? selectedDate
                  : (day ?? plannerDates(menu, subscription!)[0])
              }
              onSelect={selectCalendarDate}
            />
            {!notice &&
              visibleDates.map((date) => (
                <button
                  className={`aw-button ${day === date ? "aw-button-dark" : ""}`}
                  key={date}
                  aria-pressed={day === date}
                  onClick={() => setSelectedDate(date)}
                >
                  {DAYS_SHORT[new Date(`${date}T12:00:00`).getDay()]} {date.slice(8)}/
                  {date.slice(5, 7)}
                </button>
              ))}
          </div>
          {!notice && (
            <div
              className="aw-meals"
              aria-busy={busy}
              tabIndex={0}
              role="region"
              aria-label="Available meals"
            >
              {!meals.length ? (
                <div className="aw-notice">No active meals are available in this menu.</div>
              ) : (
                meals.map((meal) => {
                  const selected = !!day && week.data?.sels[day] === meal.id;
                  return (
                    <button
                      key={meal.id}
                      className={`aw-meal ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      disabled={busy || selected}
                      onClick={() => pick(meal.id)}
                    >
                      <span className="aw-meal-image">
                        {meal.image_url && <img src={meal.image_url} alt="" loading="lazy" />}
                      </span>
                      <span className="aw-meal-content">
                        <span className="aw-meal-heading">
                          <strong>{meal.name}</strong>
                          {meal.calories != null && <span>{meal.calories} KCal</span>}
                        </span>
                        <span className="aw-meal-description">
                          <span>Allergens: not provided</span>
                          <span>
                            {meal.description || "Ingredients and nutrition not provided"}
                          </span>
                        </span>
                        <span className="aw-sr-only">
                          {selected ? "Selected" : `Select for ${day}`}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
