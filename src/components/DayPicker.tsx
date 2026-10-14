import { DAYS } from "@/lib/format";
import { SUBSCRIPTION_DAYS } from "@/lib/subscription-rules";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUBSCRIPTION_DAYS.map((i) => {
        const on = value.includes(i);
        return (
          <Button type="button" variant="outline" key={i} aria-pressed={on} disabled={!on && value.length >= 5}
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i])}
            className={cn("rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary")}>
             {DAYS[i]}
           </Button>
        );
      })}
    </div>
  );
}
