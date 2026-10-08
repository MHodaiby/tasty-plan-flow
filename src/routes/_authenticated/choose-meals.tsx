import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Lock } from "lucide-react";
import { AppShell, Empty, Loading, PageHeader, Panel } from "@/components/AppShell";
import { MealCard, type Meal } from "@/components/MealCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { must, useMySubs, useRefresh, type Menu } from "@/lib/data";
import { errMsg, fmtDateTime, fmtDay, fmtShort, addDays, weekStartOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/choose-meals")({
  head: () => ({ meta: [{ title: "Choose Meals — Sage Table" }, { name: "description", content: "Pick your meals for each delivery day." }, { property: "og:title", content: "Choose Meals — Sage Table" }, { property: "og:description", content: "Pick your meals for each delivery day." }] }),
  component: ChooseMeals,
});

function ChooseMeals() {
  const subs = useMySubs();
  const sub = subs.data?.find((s) => s.status === "active");
  const refresh = useRefresh();
  const menus = useQuery({
    queryKey: ["published-menus"],
    queryFn: () => must<(Menu & { weekly_menu_items: { meals: Meal & { is_active: boolean } }[] })[]>(
      supabase.from("weekly_menus").select("*, weekly_menu_items(meals(*))").eq("is_published", true).gte("week_start", weekStartOf()).order("week_start") as never),
  });
  const [menuId, setMenuId] = useState<string>();
  useEffect(() => { if (!menuId && menus.data?.length) setMenuId(menus.data[0]!.id); }, [menus.data, menuId]);
  const menu = menus.data?.find((m) => m.id === menuId);

  const week = useQuery({
    queryKey: ["week", sub?.id, menu?.id],
    enabled: !!sub && !!menu,
    queryFn: async () => {
      const [deadline, dates, sels, conf] = await Promise.all([
        must<string>(supabase.rpc("selection_deadline", { _week_start: menu!.week_start })),
        must<string[]>(supabase.rpc("required_dates", { _subscription_id: sub!.id, _week_start: menu!.week_start })),
        must<{ delivery_date: string; meal_id: string }[]>(supabase.from("meal_selections").select("delivery_date, meal_id").eq("subscription_id", sub!.id).eq("menu_id", menu!.id)),
        must<{ confirmed_at: string }[]>(supabase.from("week_confirmations").select("confirmed_at").eq("subscription_id", sub!.id).eq("menu_id", menu!.id)),
      ]);
      return { deadline, dates: [...dates].sort(), sels: Object.fromEntries(sels.map((s) => [s.delivery_date, s.meal_id])), confirmedAt: conf[0]?.confirmed_at };
    },
  });
  const [day, setDay] = useState<string>();
  useEffect(() => { setDay(week.data?.dates[0]); }, [week.data?.dates.join()]);

  if (subs.isLoading || menus.isLoading) return <AppShell variant="customer"><Loading /></AppShell>;
  if (!sub) return (
    <AppShell variant="customer"><PageHeader title="Choose Meals" />
      <Empty>Meal selection opens once your subscription is active. <Link to="/subscription" className="font-semibold text-primary underline">View subscription</Link></Empty>
    </AppShell>
  );

  const closed = week.data ? new Date() >= new Date(week.data.deadline) : false;
  const meals = (menu?.weekly_menu_items ?? []).map((i) => i.meals).filter((m) => m?.is_active);
  const chosen = week.data ? week.data.dates.filter((d) => week.data!.sels[d]).length : 0;

  async function pick(mealId: string) {
    if (!day || !menu) return;
    const { error } = await supabase.from("meal_selections").upsert(
      { subscription_id: sub!.id, user_id: sub!.user_id, menu_id: menu.id, delivery_date: day, meal_id: mealId },
      { onConflict: "subscription_id,delivery_date" });
    if (error) { toast.error(errMsg(error)); return; }
    const next = week.data!.dates.find((d) => d !== day && !week.data!.sels[d]);
    if (next) setDay(next);
    refresh();
  }
  async function confirm() {
    const { error } = await supabase.rpc("confirm_week", { _subscription_id: sub!.id, _menu_id: menu!.id });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Your week is confirmed!"); refresh();
  }

  return (
    <AppShell variant="customer">
      <PageHeader title="Choose Meals" subtitle={week.data && (closed ? "Selection for this week is closed." : `Choose by ${fmtDateTime(week.data.deadline)}`)} />
      {!menus.data?.length ? <Empty>The next weekly menu hasn't been published yet. Check back soon.</Empty> : (
        <>
          <div className="mb-5 flex gap-2 overflow-x-auto">
            {menus.data.map((m) => (
              <button key={m.id} onClick={() => setMenuId(m.id)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium", m.id === menuId ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                Week of {fmtShort(m.week_start)}
              </button>
            ))}
          </div>
          {week.isLoading || !week.data ? <Loading /> : !week.data.dates.length ? <Empty>No deliveries for you this week (week of {fmtShort(menu!.week_start)} – {fmtShort(addDays(menu!.week_start, 6))}).</Empty> : (
            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              <Panel className="h-fit space-y-2 lg:sticky lg:top-6">
                {week.data.dates.map((d) => {
                  const m = meals.find((x) => x.id === week.data!.sels[d]);
                  return (
                    <button key={d} onClick={() => setDay(d)} className={cn("w-full rounded-2xl border p-3 text-left text-sm transition", d === day ? "border-primary bg-primary/10" : "border-border bg-background/60")}>
                      <div className="font-semibold">{fmtDay(d)}</div>
                      <div className={cn("text-xs", m ? "text-primary" : "text-muted-foreground")}>{m?.name ?? "Not chosen"}</div>
                    </button>
                  );
                })}
                <div className="pt-2">
                  {week.data.confirmedAt ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4" /> Confirmed {fmtDateTime(week.data.confirmedAt)}</p>
                  ) : closed ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> Closed</p>
                  ) : (
                    <Button onClick={confirm} disabled={chosen < week.data.dates.length} className="w-full rounded-full">Confirm week ({chosen}/{week.data.dates.length})</Button>
                  )}
                </div>
              </Panel>
              <div>
                {day && <h2 className="mb-4 text-xl font-semibold">{fmtDay(day)}</h2>}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {meals.map((m) => <MealCard key={m.id} meal={m} selected={!!day && week.data!.sels[day] === m.id} disabled={closed} onSelect={() => pick(m.id)} />)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
