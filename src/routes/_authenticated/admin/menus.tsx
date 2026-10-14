import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Loading, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useMeals, useMenus, useRefresh } from "@/lib/data";
import { addDays, errMsg, fmtShort, weekStartOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/menus")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Weekly Menus — Oui Chef" }, { name: "description", content: "Plan and publish weekly menus." }, { property: "og:title", content: "Weekly Menus — Oui Chef" }, { property: "og:description", content: "Plan and publish weekly menus." }] }),
  component: Menus,
});

function Menus() {
  const menus = useMenus(); const meals = useMeals(); const refresh = useRefresh();
  const [sel, setSel] = useState<string>();
  if (menus.isLoading || meals.isLoading) return <AppShell variant="admin"><Loading /></AppShell>;
  const list = menus.data ?? [];
  const menu = list.find((m) => m.id === sel) ?? list.find((m) => m.week_start >= weekStartOf()) ?? list[0];
  const run = async (p: PromiseLike<{ error: unknown }>) => { const { error } = await p; if (error) toast.error(errMsg(error)); else refresh(); };

  async function createNext() {
    const latest = list.reduce((a, m) => (m.week_start > a ? m.week_start : a), addDays(weekStartOf(), -7));
    const { data, error } = await supabase.from("weekly_menus").insert({ week_start: addDays(latest, 7) }).select().single();
    if (error) { toast.error(errMsg(error)); return; }
    setSel(data.id); refresh();
  }

  return (
    <AppShell variant="admin">
      <PageHeader title="Weekly Menus" action={<Button className="rounded-full" onClick={createNext}>Add next week</Button>} />
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {[...list].reverse().map((m) => (
          <button key={m.id} onClick={() => setSel(m.id)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium", m.id === menu?.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>
            {fmtShort(m.week_start)}{m.is_published ? " ✓" : ""}
          </button>
        ))}
      </div>
      {menu && (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Week of {fmtShort(menu.week_start)} – {fmtShort(addDays(menu.week_start, 6))}</h2>
            <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={menu.is_published} onCheckedChange={(v) => run(supabase.from("weekly_menus").update({ is_published: v }).eq("id", menu.id))} /> Published</label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {meals.data?.map((m) => {
              const on = menu.weekly_menu_items.some((i) => i.meal_id === m.id);
              return (
                <button key={m.id} disabled={!m.is_active && !on}
                  onClick={() => run(on ? supabase.from("weekly_menu_items").delete().eq("menu_id", menu.id).eq("meal_id", m.id) : supabase.from("weekly_menu_items").insert({ menu_id: menu.id, meal_id: m.id }))}
                  className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition disabled:opacity-40", on ? "border-primary bg-primary/10" : "border-border bg-background/60")}>
                  {m.image_url && <img src={m.image_url} alt="" className="size-12 rounded-xl object-cover" />}
                  <div><p className="font-semibold">{m.name}</p><p className="text-xs text-muted-foreground">{m.category}{!m.is_active && " · inactive"}</p></div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
