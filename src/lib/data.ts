import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Meal } from "@/components/MealCard";
import { weekStartOf, type SubStatus } from "@/lib/format";

export type Subscription = {
  id: string;
  user_id: string;
  billing_period: "weekly" | "monthly";
  days_per_week: number;
  default_days: number[];
  status: SubStatus;
  start_date: string | null;
  end_date: string | null;
  payment_received_at: string | null;
  admin_notes: string | null;
  created_at: string;
};
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  delivery_address: string;
  created_at: string;
};
export type Menu = { id: string; week_start: string; is_published: boolean; notes: string | null };

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user!.id;
      return must<Profile>(supabase.from("profiles").select("*").eq("id", id).single());
    },
  });

export const useMySubs = () =>
  useQuery({
    queryKey: ["my-subs"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return must<Subscription[]>(
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", data.user!.id)
          .order("created_at", { ascending: false }),
      );
    },
  });

export const useAllSubs = () =>
  useQuery({
    queryKey: ["all-subs"],
    queryFn: () =>
      must<(Subscription & { profiles: Profile | null })[]>(
        supabase
          .from("subscriptions")
          .select("*, profiles(*)")
          .order("created_at", { ascending: false }) as never,
      ),
  });

export const useUserSubs = (userId: string) =>
  useQuery({
    queryKey: ["user-subs", userId],
    queryFn: () =>
      must<(Subscription & { profiles: Profile | null })[]>(
        supabase
          .from("subscriptions")
          .select("*, profiles(*)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ),
  });

export const useProfiles = () =>
  useQuery({
    queryKey: ["profiles"],
    queryFn: () => must<Profile[]>(supabase.from("profiles").select("*").order("full_name")),
  });

export const useProfile = (userId: string) =>
  useQuery({
    queryKey: ["profile", userId],
    queryFn: () =>
      must<Profile>(supabase.from("profiles").select("*").eq("id", userId).maybeSingle()),
  });

export const useMeals = () =>
  useQuery({
    queryKey: ["meals"],
    queryFn: () =>
      must<(Meal & { is_active: boolean })[]>(supabase.from("meals").select("*").order("name")),
  });

export const useMenus = () =>
  useQuery({
    queryKey: ["menus"],
    queryFn: () =>
      must<(Menu & { weekly_menu_items: { meal_id: string }[] })[]>(
        supabase
          .from("weekly_menus")
          .select("*, weekly_menu_items(meal_id)")
          .order("week_start", { ascending: false }) as never,
      ),
  });

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export const usePublishedMenus = () =>
  useQuery({
    queryKey: ["published-menus"],
    queryFn: () =>
      must<(Menu & { weekly_menu_items: { meals: Meal & { is_active: boolean } }[] })[]>(
        supabase
          .from("weekly_menus")
          .select("*, weekly_menu_items(meals(*))")
          .eq("is_published", true)
          .gte("week_start", weekStartOf())
          .order("week_start") as never,
      ),
  });

export const useWeeklySelection = (
  sub:
    | (Subscription & {
        profiles: Profile | null;
      })
    | undefined,
  menu:
    | (Menu & {
        weekly_menu_items: {
          meals: Meal & {
            is_active: boolean;
          };
        }[];
      })
    | undefined,
) =>
  useQuery({
    queryKey: ["week", sub?.id, menu?.id],
    enabled: !!sub && !!menu,
    queryFn: async () => {
      if (!sub || !menu) throw new Error("Choose an active subscription and menu.");
      const [deadline, dates, sels, conf] = await Promise.all([
        must<string>(supabase.rpc("selection_deadline", { _week_start: menu.week_start })),
        must<string[]>(
          supabase.rpc("required_dates", {
            _subscription_id: sub.id,
            _week_start: menu.week_start,
          }),
        ),
        must<{ delivery_date: string; meal_id: string }[]>(
          supabase
            .from("meal_selections")
            .select("delivery_date, meal_id")
            .eq("subscription_id", sub.id)
            .eq("menu_id", menu.id),
        ),
        must<{ confirmed_at: string }[]>(
          supabase
            .from("week_confirmations")
            .select("confirmed_at")
            .eq("subscription_id", sub.id)
            .eq("menu_id", menu.id),
        ),
      ]);
      return {
        deadline,
        dates: [...dates].sort(),
        sels: Object.fromEntries(sels.map((s) => [s.delivery_date, s.meal_id])),
        confirmedAt: conf[0]?.confirmed_at,
      };
    },
  });

export { must };
