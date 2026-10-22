import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Repeat,
  User,
  Users,
  UtensilsCrossed,
  Inbox,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof User; exact?: boolean };

const CUSTOMER_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subscription", label: "My Subscription", icon: Repeat },
  { to: "/choose-meals", label: "Choose Meals", icon: UtensilsCrossed },
  { to: "/profile", label: "Profile", icon: User },
];
const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/requests", label: "Subscription Requests", icon: Inbox },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/admin/meals", label: "Meals", icon: ChefHat },
  { to: "/admin/menus", label: "Weekly Menus", icon: CalendarDays },
  { to: "/admin/selections", label: "Meal Selections", icon: ClipboardList },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <ChefHat className="size-5" />
      </span>
      <span className="font-display text-xl font-semibold">Oui Chef</span>
    </div>
  );
}

export function AppShell({
  variant,
  children,
}: {
  variant: "customer" | "admin";
  children: ReactNode;
}) {
  const nav = variant === "admin" ? ADMIN_NAV : CUSTOMER_NAV;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending" && s.location.pathname !== s.resolvedLocation?.pathname,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const linkCls =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  const activeCls =
    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground";

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-5 backdrop-blur md:flex">
        <Logo />
        {variant === "admin" && (
          <span className="-mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin
          </span>
        )}
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: !!n.exact }}
              className={linkCls}
              activeProps={{ className: activeCls }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className={cn(linkCls, "mt-auto")}>
          <LogOut className="size-4" /> Sign out
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
        >
          <LogOut className="size-5" />
        </button>
      </header>
      {variant === "admin" && (
        <nav className="sticky top-[61px] z-20 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: !!n.exact }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}

      <main
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-10 md:py-10",
          variant === "customer" && "pb-28 md:pb-10",
        )}
      >
        {isNavigating ? <PageSkeleton /> : children}
      </main>

      {variant === "customer" && (
        <nav className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl p-1.5 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              <n.icon className="size-5" />
              {n.label.replace("My ", "")}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-3xl p-5 md:p-6", className)}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Loading({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

export function PageSkeleton() {
  const bar = "animate-pulse rounded-xl bg-muted";
  return (
    <div role="status" aria-label="Loading" aria-busy="true">
      <div className="mb-8 space-y-3">
        <div className={cn(bar, "h-9 w-64")} />
        <div className={cn(bar, "h-4 w-96 max-w-full")} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(bar, "h-28 rounded-3xl")} />
        ))}
      </div>
      <div className={cn(bar, "mt-6 h-64 rounded-3xl")} />
    </div>
  );
}

export function PendingShell() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return (
    <AppShell variant={path.startsWith("/admin") ? "admin" : "customer"}>
      <PageSkeleton />
    </AppShell>
  );
}
