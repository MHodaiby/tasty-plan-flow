export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type SubStatus = "pending_payment" | "active" | "paused" | "expired" | "cancelled";
export const STATUS_LABEL: Record<SubStatus, string> = {
  pending_payment: "Pending Payment",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
  cancelled: "Cancelled",
};
export const OPEN_STATUSES: SubStatus[] = ["pending_payment", "active", "paused"];

export const pad = (n: number) => String(n).padStart(2, "0");
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s: string) => new Date(`${s}T00:00:00`);

export function weekStartOf(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return toISODate(x);
}
export function addDays(iso: string, n: number) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
export const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
export const dowOf = (iso: string) => parseDate(iso).getDay();

export const fmtDay = (iso: string) =>
  parseDate(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
export const fmtShort = (iso?: string | null) =>
  iso ? parseDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (ts?: string | null) =>
  ts
    ? new Date(ts).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })
    : "—";
export const daysList = (days: number[]) => [...days].sort((a, b) => a - b).map((d) => DAYS[d]).join(", ");

/** Suggested end date when a subscription is activated. */
export function defaultEndDate(start: string, period: "weekly" | "monthly") {
  return addDays(start, period === "weekly" ? 6 : 29);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong");
