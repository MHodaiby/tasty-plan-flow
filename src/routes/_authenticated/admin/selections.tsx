import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Empty, Loading, PageHeader, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { must, useMenus } from "@/lib/data";
import { fmtDay, fmtShort, weekStartOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/selections")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Meal Selections — Oui Chef" }, { name: "description", content: "Kitchen counts and customer choices." }, { property: "og:title", content: "Meal Selections — Oui Chef" }, { property: "og:description", content: "Kitchen counts and customer choices." }] }),
  component: Selections,
});

type Row = { delivery_date: string; subscription_id: string; meals: { name: string } | null; profiles: { full_name: string; delivery_address: string; phone: string } | null };

function Selections() {
  const menus = useMenus();
  const [sel, setSel] = useState<string>();
  const list = [...(menus.data ?? [])].reverse();
  const menu = list.find((m) => m.id === sel) ?? list.find((m) => m.week_start >= weekStartOf()) ?? list[list.length - 1];
  const data = useQuery({
    queryKey: ["admin-selections", menu?.id],
    enabled: !!menu,
    queryFn: async () => {
      const [rows, conf] = await Promise.all([
        must<Row[]>(supabase.from("meal_selections").select("delivery_date, subscription_id, meals(name), profiles(full_name, delivery_address, phone)").eq("menu_id", menu!.id).order("delivery_date") as never),
        must<{ subscription_id: string }[]>(supabase.from("week_confirmations").select("subscription_id").eq("menu_id", menu!.id)),
      ]);
      return { rows, confirmed: new Set(conf.map((c) => c.subscription_id)) };
    },
  });

  if (menus.isLoading) return <AppShell variant="admin"><Loading /></AppShell>;
  const byDate = new Map<string, Row[]>();
  data.data?.rows.forEach((r) => byDate.set(r.delivery_date, [...(byDate.get(r.delivery_date) ?? []), r]));

  return (
    <AppShell variant="admin">
      <PageHeader title="Meal Selections" subtitle="Daily kitchen counts and delivery list." />
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {list.map((m) => (
          <button key={m.id} onClick={() => setSel(m.id)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium", m.id === menu?.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>Week of {fmtShort(m.week_start)}</button>
        ))}
      </div>
      {data.isLoading ? <Loading /> : !byDate.size ? <Empty>No meals selected for this week yet.</Empty> : (
        <div className="space-y-5">
          {[...byDate.entries()].map(([date, rows]) => {
            const counts = new Map<string, number>();
            rows.forEach((r) => counts.set(r.meals?.name ?? "?", (counts.get(r.meals?.name ?? "?") ?? 0) + 1));
            return (
              <Panel key={date}>
                <h2 className="text-xl font-semibold">{fmtDay(date)} <span className="text-sm font-normal text-muted-foreground">· {rows.length} meals</span></h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...counts.entries()].map(([n, c]) => <span key={n} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">{c} × {n}</span>)}
                </div>
                <ul className="mt-4 divide-y divide-border text-sm">
                  {rows.map((r) => (
                    <li key={r.subscription_id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span><span className="font-medium">{r.profiles?.full_name}</span> <span className="text-muted-foreground">· {r.profiles?.delivery_address}</span></span>
                      <span>{r.meals?.name} {data.data!.confirmed.has(r.subscription_id) ? <span className="text-primary">✓</span> : <span className="text-muted-foreground">(not confirmed)</span>}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
