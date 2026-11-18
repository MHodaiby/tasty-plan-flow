import { useState, useRef, useId } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { fmtShort, parseDate, toISODate } from "@/lib/format";

export function DeliveryCalendar({
  dates,
  selected,
  onSelect,
}: {
  dates: string[];
  selected: string | undefined;
  onSelect: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendarId = useId();
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  const available = new Set(dates);
  return (
    <div
      className="aw-calendar-wrapper"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <button
        type="button"
        className="aw-week-calendar"
        aria-label={`Choose delivery date${selected ? `, ${fmtShort(selected)}` : ""}`}
        aria-expanded={open}
        aria-controls={calendarId}
        ref={trigger}
        onClick={() => setOpen(!open)}
      >
        <span>{selected ? fmtShort(selected) : "Choose date"}</span>
        <CalendarDays size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="aw-calendar-popover" id={calendarId}>
          <DayPicker
            mode="single"
            weekStartsOn={0}
            autoFocus
            defaultMonth={parseDate(selected ?? dates[0]!)}
            selected={selected ? parseDate(selected) : undefined}
            startMonth={parseDate(dates[0]!)}
            endMonth={parseDate(dates.at(-1)!)}
            disabled={(date) => !available.has(toISODate(date))}
            onSelect={(date) => {
              if (date && available.has(toISODate(date))) {
                onSelect(toISODate(date));
                close();
              }
            }}
          />
          <button type="button" className="aw-button" onClick={close}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
