import { cn } from "@/lib/utils";
import { STATUS_LABEL, type SubStatus } from "@/lib/format";

const STYLES: Record<SubStatus, string> = {
  pending_payment: "bg-accent text-accent-foreground",
  active: "bg-primary/15 text-primary",
  paused: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status, className }: { status: SubStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", STYLES[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
