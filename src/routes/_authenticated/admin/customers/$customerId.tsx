import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, Empty } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  useProfile,
  useRefresh,
  useUserSubs,
  usePublishedMenus,
  useWeeklySelection,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { SubscriptionAdminCard } from "@/components/SubscriptionAdminCard";
import { errMsg } from "@/lib/format";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MealCard } from "@/components/MealCard";
import { fmtDateTime, fmtDay, fmtShort, addDays } from "@/lib/format";
import { Loading } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/customers/$customerId")({
  component: CustomerDetails,
});

function CustomerDetails() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const customer = useProfile(customerId);
  const customerSubs = useUserSubs(customerId);
  const refresh = useRefresh();

  function ProfilePage() {
    const [f, setF] = useState({ full_name: "", phone: "", delivery_address: "" });
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (customer?.data)
        setF({
          full_name: customer.data.full_name,
          phone: customer.data.phone,
          delivery_address: customer.data.delivery_address,
        });
    }, [customer?.data]);

    async function save() {
      if (f.full_name.trim().length < 2 || f.delivery_address.trim().length < 8) {
        toast.error("Please fill in your name and full address");
        return;
      }
      setBusy(true);
      const { error } = await supabase.from("profiles").update(f).eq("id", customer.data!.id);
      setBusy(false);
      if (error) {
        toast.error(errMsg(error));
        return;
      }
      toast.success("Profile saved");
      refresh();
    }
    return (
      <>
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone number</Label>
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Delivery address</Label>
          <Textarea
            rows={3}
            value={f.delivery_address}
            onChange={(e) => setF({ ...f, delivery_address: e.target.value })}
          />
        </div>
        <Button onClick={save} disabled={busy} className="rounded-full">
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </>
    );
  }

  function Subs() {
    return (
      <>
        {!customerSubs.data?.length ? (
          <Empty>No subscriptions here.</Empty>
        ) : (
          <div>
            {customerSubs.data?.map((s) => (
              <SubscriptionAdminCard key={s.id} sub={s} />
            ))}
          </div>
        )}
      </>
    );
  }

  function ChooseMeals() {
    const subs = customerSubs;
    const sub = subs.data?.find((s) => s.status === "active");
    const menus = usePublishedMenus();
    const [menuId, setMenuId] = useState<string>();
    useEffect(() => {
      const first = menus.data?.[0];
      if (!menuId && first) setMenuId(first.id);
    }, [menus.data, menuId]);
    const menu = menus.data?.find((m) => m.id === menuId);
    const week = useWeeklySelection(sub, menu);
    const [day, setDay] = useState<string>();
    useEffect(() => {
      setDay(week.data?.dates[0]);
    }, [week.data?.dates.join()]);

    if (!sub)
      return (
        <>
          <PageHeader title="Choose Meals" />
          <Empty>Meal selection opens once your subscription is active. </Empty>
        </>
      );

    const closed = week.data ? new Date() >= new Date(week.data.deadline) : false;
    const meals = (menu?.weekly_menu_items ?? []).map((i) => i.meals).filter((m) => m?.is_active);

    async function pick(mealId: string) {
      if (!day || !menu || !sub || !week.data) return;
      if (closed) {
        const confirm = window.confirm(
          "Meal selection is closed for this week. Are you sure you want to change your selection?",
        );
        if (!confirm) return;
      }
      const { error } = await supabase.from("meal_selections").upsert(
        {
          subscription_id: sub.id,
          user_id: sub.user_id,
          menu_id: menu.id,
          delivery_date: day,
          meal_id: mealId,
        },
        { onConflict: "subscription_id,delivery_date" },
      );
      if (error) {
        toast.error(errMsg(error));
        return;
      }
      refresh();
    }

    return (
      <>
        {!menus.data?.length ? (
          <Empty>The next weekly menu hasn't been published yet. Check back soon.</Empty>
        ) : (
          <>
            <div className="mb-5 flex gap-2 overflow-x-auto">
              {menus.data.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMenuId(m.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium",
                    m.id === menuId ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  Week of {fmtShort(m.week_start)}
                </button>
              ))}
            </div>
            {week.isLoading || !week.data ? (
              <Loading />
            ) : !week.data.dates.length ? (
              <Empty>
                No deliveries for you this week (week of {fmtShort(menu?.week_start)} –{" "}
                {menu && fmtShort(addDays(menu.week_start, 4))}).
              </Empty>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                <Panel className="h-fit space-y-2 lg:sticky lg:top-6">
                  {week.data.dates.map((d) => {
                    const m = meals.find((x) => x.id === week.data?.sels[d]);
                    return (
                      <button
                        key={d}
                        onClick={() => setDay(d)}
                        className={cn(
                          "w-full rounded-2xl border p-3 text-left text-sm transition",
                          d === day
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background/60",
                        )}
                      >
                        <div className="font-semibold">{fmtDay(d)}</div>
                        <div
                          className={cn("text-xs", m ? "text-primary" : "text-muted-foreground")}
                        >
                          {m?.name ?? "Not chosen"}
                        </div>
                      </button>
                    );
                  })}
                  {closed && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="size-4" /> Closed
                    </p>
                  )}
                </Panel>
                <div>
                  {day && <h2 className="mb-4 text-xl font-semibold">{fmtDay(day)}</h2>}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {meals.map((m) => (
                      <MealCard
                        key={m.id}
                        meal={m}
                        selected={!!day && week.data?.sels[day] === m.id}
                        onSelect={() => pick(m.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  if (customer.isPending || customerSubs.isPending) {
    return <p>Loading customer details...</p>;
  }

  if (!customer) {
    return <p>Customer not found.</p>;
  }

  return (
    <>
      <PageHeader
        title={customer.data?.full_name || "Customer Details"}
        action={
          <Button onClick={() => navigate({ to: "/admin/customers" })}>Back to Customers</Button>
        }
        subtitle={customer?.data?.email}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel className="space-y-4">
          <ProfilePage />
        </Panel>
        <Panel className="space-y-4">
          <Subs />
        </Panel>
      </div>
      <Panel className="space-y-4">
        <ChooseMeals />
      </Panel>
    </>
  );
}
