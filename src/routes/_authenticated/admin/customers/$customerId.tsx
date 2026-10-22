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
    <div className="min-h-screen bg-[#F6F3EA] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Customer header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DFE8D9] text-lg font-semibold text-[#416F4D]">
              {customer.data?.full_name
                ?.split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "CU"}
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-[#758073]">
                Customer details
              </p>

              <h1 className="truncate font-serif text-2xl font-bold tracking-tight text-[#203328] sm:text-3xl">
                {customer.data?.full_name || "Customer Details"}
              </h1>

              <p className="mt-1 break-all text-sm text-[#73796F]">{customer.data?.email}</p>
            </div>
          </div>

          <Button
            onClick={() => navigate({ to: "/admin/customers" })}
            className="w-full shrink-0 sm:w-auto"
          >
            Back to Customers
          </Button>
        </header>

        {/* Profile and subscription */}
        <section
          aria-label="Customer overview"
          className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2"
        >
          <div className="min-w-0 rounded-3xl border border-white/70 bg-[#FCFAF4] p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-serif text-xl font-semibold text-[#203328]">Customer profile</h2>
              <p className="mt-1 text-sm text-[#73796F]">
                Contact information and delivery details
              </p>
            </div>

            <ProfilePage />
          </div>

          <div className="min-w-0 rounded-3xl border border-white/70 bg-[#FCFAF4] p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-serif text-xl font-semibold text-[#203328]">Subscription</h2>
              <p className="mt-1 text-sm text-[#73796F]">
                Plan details and subscription management
              </p>
            </div>

            <Subs />
          </div>
        </section>

        {/* Meal planner */}
        <section
          aria-label="Meal planner"
          className="min-w-0 rounded-3xl border border-white/70 bg-[#FCFAF4] p-4 shadow-sm sm:p-6"
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#203328]">Meal planner</h2>
              <p className="mt-1 text-sm text-[#73796F]">
                Manage weekly deliveries and meal selections
              </p>
            </div>
          </div>

          <ChooseMeals />
        </section>
      </div>
    </div>
  );
}
