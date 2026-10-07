import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Meal = { id: string; name: string; description: string; image_url: string | null; category: string };

export function MealImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={cn("h-full w-full object-cover", className)} />
  ) : (
    <div className={cn("grid h-full w-full place-items-center bg-secondary text-sm text-muted-foreground", className)}>No photo</div>
  );
}

export function MealCard({
  meal, selected, disabled, onSelect, footer,
}: { meal: Meal; selected?: boolean; disabled?: boolean; onSelect?: () => void; footer?: ReactNode }) {
  return (
    <div className={cn("glass flex flex-col overflow-hidden rounded-3xl transition", selected && "ring-2 ring-primary")}>
      <div className="relative aspect-[4/3]">
        <MealImage src={meal.image_url} alt={meal.name} />
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur">{meal.category}</span>
        {selected && (
          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" /></span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold leading-tight">{meal.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{meal.description}</p>
        {onSelect && (
          <button
            onClick={onSelect}
            disabled={disabled || selected}
            className={cn(
              "mt-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
              selected ? "bg-primary/15 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90",
              disabled && !selected && "cursor-not-allowed opacity-50",
            )}
          >
            {selected ? "Selected" : "Select"}
          </button>
        )}
        {footer}
      </div>
    </div>
  );
}
