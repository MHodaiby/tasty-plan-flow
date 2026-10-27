import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Loading, PageHeader, Panel } from "@/components/AppShell";
import { MealCard } from "@/components/MealCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useMeals, useRefresh } from "@/lib/data";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/meals")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Meals — Oui Chef" },
      { name: "description", content: "Manage the meal catalogue." },
      { property: "og:title", content: "Meals — Oui Chef" },
      { property: "og:description", content: "Manage the meal catalogue." },
    ],
  }),
  component: Meals,
});

const blank = { id: "", name: "", description: "", category: "Main", image_url: "", calories: "" };

function Meals() {
  const meals = useMeals();
  const refresh = useRefresh();
  const [f, setF] = useState<typeof blank | null>(null);

  async function save() {
    if (!f || f.name.trim().length < 2) {
      toast.error("Enter a meal name");
      return;
    }
    const row = {
      name: f.name.trim(),
      description: f.description,
      category: f.category || "Main",
      image_url: f.image_url || null,
      calories: f.calories ? parseInt(f.calories) : null,
    };
    const { error } = f.id
      ? await supabase.from("meals").update(row).eq("id", f.id)
      : await supabase.from("meals").insert(row);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success("Meal saved");
    setF(null);
    refresh();
  }
  async function toggle(id: string, is_active: boolean) {
    const { error } = await supabase.from("meals").update({ is_active }).eq("id", id);
    if (error) toast.error(errMsg(error));
    else refresh();
  }

  if (meals.isLoading)
    return (
      <AppShell variant="admin">
        <Loading />
      </AppShell>
    );
  return (
    <AppShell variant="admin">
      <PageHeader
        title="Meals"
        action={
          <Button className="rounded-full" onClick={() => setF(blank)}>
            Add meal
          </Button>
        }
      />
      {f && (
        <Panel className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Calories (kcal)</Label>
            <Input
              type="number"
              placeholder="e.g. 520"
              value={f.calories}
              onChange={(e) => setF({ ...f, calories: e.target.value })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Photo link</Label>
            <Input
              placeholder="https://…"
              value={f.image_url}
              onChange={(e) => setF({ ...f, image_url: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full" onClick={save}>
              Save
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setF(null)}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {meals.data?.map((m) => (
          <div key={m.id} className={m.is_active ? "" : "opacity-60"}>
            <MealCard
              meal={m}
              footer={
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={m.is_active} onCheckedChange={(v) => toggle(m.id, v)} /> Active
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      setF({
                        id: m.id,
                        name: m.name,
                        description: m.description,
                        category: m.category,
                        image_url: m.image_url ?? "",
                        calories: m.calories?.toString() ?? "",
                      })
                    }
                  >
                    Edit
                  </Button>
                </div>
              }
            />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
