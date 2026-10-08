import { DAYS_SHORT } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DayPicker({ value, max, onChange }: { value: number[]; max: number; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DAYS_SHORT.map((d, i) => {
        const on = value.includes(i);
        return (
          <button type="button" key={d} disabled={!on && value.length >= max}
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i])}
            className={cn("rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary")}>
            {d}
          </button>
        );
      })}
    </div>
  );
}
