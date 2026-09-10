"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "value"
  | "defaultValue"
  | "onChange"
  | "size"
  | "min"
  | "max"
  | "step"
> {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  density?: "compact" | "regular";
  error?: string;
  hint?: string;
}
const format = (date: Date) =>
  `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
function parse(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && format(date) === value
    ? date
    : null;
}
const todayValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
function monthOf(value: string) {
  return `${value.slice(0, 7)}-01`;
}
function shiftDay(value: string, amount: number) {
  const date = parse(value)!;
  date.setUTCDate(date.getUTCDate() + amount);
  return format(date);
}
function shiftMonth(value: string, amount: number) {
  const date = parse(value)!;
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  return format(date);
}

/** Controlled ISO calendar-date field. Native typing, validation and form data
 * are retained; the calendar popover inherits the surrounding theme. */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    {
      value,
      onValueChange,
      label,
      min,
      max,
      density = "regular",
      error,
      hint,
      id,
      className,
      disabled,
      readOnly,
      required,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const popupId = `${inputId}-calendar`;
    const descriptionId = `${inputId}-description`;
    const input = useRef<HTMLInputElement | null>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState("2000-01-01");
    const [today, setToday] = useState("");
    const lower = min && parse(min) ? min : "0001-01-01";
    const upper = max && parse(max) ? max : "9999-12-31";
    const inRange = (date: string) => date >= lower && date <= upper;
    const clamp = (date: string) =>
      !parse(date)
        ? date.startsWith("-")
          ? lower
          : upper
        : date < lower
          ? lower
          : date > upper
            ? upper
            : date;
    const month = monthOf(cursor);
    const first = parse(month)!;
    const count = new Date(first.getTime());
    count.setUTCMonth(count.getUTCMonth() + 1, 0);
    const offset = (first.getUTCDay() + 6) % 7;
    const cells = Array.from({ length: 42 }, (_, index) => {
      const day = index - offset + 1;
      return day >= 1 && day <= count.getUTCDate()
        ? `${month.slice(0, 7)}-${String(day).padStart(2, "0")}`
        : null;
    });
    const close = (restore = true) => {
      popup.current?.hidePopover?.();
      setOpen(false);
      if (restore) trigger.current?.focus();
    };
    useEffect(() => {
      if (!open) return;
      popup.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)
        ?.focus();
    }, [open, cursor]);
    useLayoutEffect(() => {
      if (!open) return;
      const position = () => {
        if (!popup.current || !input.current) return;
        const field = input.current.getBoundingClientRect();
        const bounds = popup.current.getBoundingClientRect();
        const viewport = window.visualViewport;
        const width = viewport?.width ?? window.innerWidth;
        const height = viewport?.height ?? window.innerHeight;
        const left = viewport?.offsetLeft ?? 0;
        const top = viewport?.offsetTop ?? 0;
        popup.current.style.left = `${Math.max(left + 8, Math.min(field.left, left + width - bounds.width - 8))}px`;
        popup.current.style.top = `${Math.max(top + 8, Math.min(field.bottom + bounds.height + 8 <= top + height ? field.bottom + 7 : field.top - bounds.height - 7, top + height - bounds.height - 8))}px`;
      };
      position();
      window.addEventListener("resize", position);
      window.addEventListener("scroll", position, true);
      window.visualViewport?.addEventListener("resize", position);
      return () => {
        window.removeEventListener("resize", position);
        window.removeEventListener("scroll", position, true);
        window.visualViewport?.removeEventListener("resize", position);
      };
    }, [open]);
    useEffect(() => {
      if (disabled || readOnly) popup.current?.hidePopover?.();
    }, [disabled, readOnly]);
    const show = () => {
      if (disabled || readOnly || lower > upper) return;
      if (open) {
        close();
        return;
      }
      if (!popup.current?.showPopover) {
        try {
          input.current?.showPicker?.();
        } catch {
          // A few browsers expose showPicker but reject it in embedded contexts.
          input.current?.click();
        }
        return;
      }
      const today = todayValue();
      setToday(today);
      setCursor(clamp(parse(value) ? value : today));
      popup.current.showPopover();
      setOpen(true);
    };
    const choose = (date: string) => {
      if (disabled || readOnly || (date ? !inRange(date) : required)) return;
      onValueChange(date);
      close();
    };
    const navigate = (
      event: KeyboardEvent<HTMLButtonElement>,
      date: string,
    ) => {
      let next: string | undefined;
      if (event.key === "ArrowLeft") next = shiftDay(date, -1);
      if (event.key === "ArrowRight") next = shiftDay(date, 1);
      if (event.key === "ArrowUp") next = shiftDay(date, -7);
      if (event.key === "ArrowDown") next = shiftDay(date, 7);
      if (event.key === "Home")
        next = shiftDay(date, -((parse(date)!.getUTCDay() + 6) % 7));
      if (event.key === "End")
        next = shiftDay(date, 6 - ((parse(date)!.getUTCDay() + 6) % 7));
      if (event.key === "PageUp")
        next = shiftMonth(date, event.shiftKey ? -12 : -1);
      if (event.key === "PageDown")
        next = shiftMonth(date, event.shiftKey ? 12 : 1);
      if (next) {
        event.preventDefault();
        setCursor(clamp(next));
      }
    };
    const accessibleName = props["aria-label"] ?? label ?? "Date";
    return (
      <div className={cn("ui-date-field", className)} data-density={density}>
        {label && (
          <label htmlFor={inputId} className="ui-date-label">
            {label}
            {required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        <div className="ui-date-control">
          <input
            {...props}
            ref={(node) => {
              input.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            id={inputId}
            type="date"
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              if (!next || (parse(next) && inRange(next))) onValueChange(next);
            }}
            min={min}
            max={max}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={
              [props["aria-describedby"], error || hint ? descriptionId : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-label={label ? props["aria-label"] : accessibleName}
            onKeyDown={(event) => {
              props.onKeyDown?.(event);
              if (
                !event.defaultPrevented &&
                event.altKey &&
                event.key === "ArrowDown"
              ) {
                event.preventDefault();
                show();
              }
            }}
          />
          <button
            ref={trigger}
            type="button"
            className="ui-date-trigger"
            aria-label={`Choose ${accessibleName.toLowerCase()}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={popupId}
            disabled={disabled || readOnly || lower > upper}
            onClick={show}
          >
            <CalendarDays size={17} aria-hidden />
          </button>
        </div>
        {(error || hint) && (
          <p
            id={descriptionId}
            className="ui-date-description"
            role={error ? "alert" : undefined}
          >
            {error || hint}
          </p>
        )}
        <div
          ref={popup}
          id={popupId}
          popover="auto"
          role="dialog"
          aria-label={`Choose ${accessibleName.toLowerCase()}`}
          className="ui-date-calendar"
          onToggle={(event) => {
            if (event.newState === "closed") setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
          onBlur={(event) => {
            if (
              event.relatedTarget &&
              !event.currentTarget.contains(event.relatedTarget as Node) &&
              event.relatedTarget !== trigger.current
            )
              close(false);
          }}
        >
          <div className="ui-date-calendar-heading">
            <button
              type="button"
              aria-label="Previous month"
              disabled={month <= monthOf(lower)}
              onClick={() => setCursor(clamp(shiftMonth(cursor, -1)))}
            >
              <ChevronLeft size={17} />
            </button>
            <strong aria-live="polite">
              {new Intl.DateTimeFormat("en", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(first)}
            </strong>
            <button
              type="button"
              aria-label="Next month"
              disabled={month >= monthOf(upper)}
              onClick={() => setCursor(clamp(shiftMonth(cursor, 1)))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div role="grid" aria-label="Calendar dates">
            <div role="row" className="ui-date-weekdays">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                <span role="columnheader" key={day}>
                  {day}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, row) => (
              <div role="row" className="ui-date-week" key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((date, index) => (
                  <div
                    role="gridcell"
                    aria-selected={date !== null && date === value}
                    key={date ?? `blank-${index}`}
                  >
                    {date && (
                      <button
                        type="button"
                        data-date={date}
                        data-today={date === today}
                        aria-current={date === today ? "date" : undefined}
                        aria-label={new Intl.DateTimeFormat("en", {
                          dateStyle: "full",
                          timeZone: "UTC",
                        }).format(parse(date)!)}
                        disabled={!inRange(date)}
                        tabIndex={date === cursor ? 0 : -1}
                        onKeyDown={(event) => navigate(event, date)}
                        onClick={() => choose(date)}
                      >
                        {Number(date.slice(-2))}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="ui-date-calendar-footer">
            <button
              type="button"
              disabled={!inRange(today)}
              onClick={() => choose(today)}
            >
              Today
            </button>
            <button
              type="button"
              disabled={required || !value}
              onClick={() => choose("")}
            >
              Clear
            </button>
            <button type="button" onClick={() => close()}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  },
);
