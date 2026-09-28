"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { formatManilaDate, getManilaTodayString, parseManilaDate } from "@/lib/study-plan";

/**
 * ReviewTayo-styled accessible calendar picker (replaces native
 * <input type="date">, whose dropdown cannot be styled or reliably keyboarded
 * across browsers).
 *
 * - Value is a plain YYYY-MM-DD string, exactly like the native input — all
 *   date math stays Asia/Manila-anchored (see @/lib/study-plan), so storage
 *   and timezone behavior are unchanged.
 * - Keyboard: Enter/Space open; arrows move days, Shift+arrows move weeks,
 *   PageUp/PageDown move months, Home/End jump within the week, Escape closes
 *   without selecting; focus returns to the trigger on close.
 * - `min`/`max` (YYYY-MM-DD) disable out-of-range days and clamp navigation.
 * - Popover is absolutely positioned within a relative wrapper so it also
 *   works inside dialogs (onboarding steps, settings forms).
 */

interface DatePickerProps {
  /** Selected date as YYYY-MM-DD, or "" for no selection. */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable date (YYYY-MM-DD), inclusive. */
  min?: string;
  /** Latest selectable date (YYYY-MM-DD), inclusive. */
  max?: string;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Safe key for a month grid from a Date (UTC-anchored, DST-free). */
function monthKey(y: number, m: number): number {
  return y * 12 + m;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  id,
  ariaLabel = "Choose a date",
  placeholder = "Pick a date",
  className = "",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  // View month: { y, m } with m 0-indexed, UTC-anchored.
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  // Day currently focused inside the grid (1-based day-of-month).
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const todayIso = getManilaTodayString();
  const minKey = min ? parseManilaDate(min)?.getTime() ?? null : null;
  const maxKey = max ? parseManilaDate(max)?.getTime() ?? null : null;

  const display = value ? formatManilaDate(value, false) : "";

  /**
   * Split a validated ISO date into {y, m, d} from the string itself.
   * (parseManilaDate returns a Date at Manila midnight — 16:00Z the previous
   * day — so its UTC getters would yield the WRONG civil day here.)
   */
  const parts = useCallback((iso: string) => {
    if (!parseManilaDate(iso)) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
  }, []);

  // Open on the selected date's month, else today's month; focus the
  // selected/today day inside the grid for immediate keyboard use.
  const openPopover = useCallback(() => {
    if (disabled) return;
    const anchor = parts(value || todayIso) || parts(todayIso);
    if (anchor) setView({ y: anchor.y, m: anchor.m });
    setFocusedDay(anchor?.d ?? null);
    setOpen(true);
  }, [disabled, parts, value, todayIso]);

  const closePopover = useCallback((restoreFocus = true) => {
    setOpen(false);
    setView(null);
    setFocusedDay(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closePopover(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closePopover]);

  /** ISO string for a day cell in the viewed month. */
  const isoFor = useCallback(
    (y: number, m: number, d: number) =>
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    []
  );

  const isDisabled = useCallback(
    (iso: string) => {
      const t = parseManilaDate(iso)?.getTime();
      if (t === null || t === undefined) return true;
      if (minKey !== null && t < minKey) return true;
      if (maxKey !== null && t > maxKey) return true;
      return false;
    },
    [minKey, maxKey]
  );

  const select = useCallback(
    (iso: string) => {
      if (isDisabled(iso)) return;
      onChange(iso);
      closePopover();
    },
    [isDisabled, onChange, closePopover]
  );

  /** Move the focused day by a delta within the grid, flipping months as needed. */
  const moveFocused = useCallback(
    (delta: number) => {
      if (!view) return;
      // Walk from the currently focused date (or a safe anchor) by delta days,
      // using true y/m/d parts (UTC arithmetic is DST-free).
      const anchorDay = focusedDay ?? 1;
      const base = parts(isoFor(view.y, view.m, anchorDay));
      if (!base) return;
      const next = Date.UTC(base.y, base.m, base.d) + delta * 86400000;
      const nextDate = new Date(next);
      const y = nextDate.getUTCFullYear();
      const m = nextDate.getUTCMonth();
      const d = nextDate.getUTCDate();
      // Clamp into the allowed range: if the target is disabled, stop at the
      // boundary in the direction of travel (civil-space parts, not timestamps).
      const iso = isoFor(y, m, d);
      if (isDisabled(iso)) {
        const boundary = delta < 0 ? min : max;
        const b = boundary ? parts(boundary) : null;
        if (b) {
          setView({ y: b.y, m: b.m });
          setFocusedDay(b.d);
        }
        return;
      }
      setView({ y, m });
      setFocusedDay(d);
    },
    [view, focusedDay, isoFor, isDisabled, minKey, maxKey]
  );

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (!view) return;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moveFocused(1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocused(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocused(7);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocused(-7);
        break;
      case "PageUp":
        e.preventDefault();
        moveFocused(-30); // clamps to the previous month's visible day below
        break;
      case "PageDown":
        e.preventDefault();
        moveFocused(30);
        break;
      case "Home": {
        e.preventDefault();
        if (focusedDay) {
          const back = ((focusedDay - 1) % 7) * -1;
          moveFocused(back);
        }
        break;
      }
      case "End": {
        e.preventDefault();
        if (focusedDay) {
          const fwd = 6 - ((focusedDay - 1) % 7);
          moveFocused(fwd);
        }
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (view && focusedDay) select(isoFor(view.y, view.m, focusedDay));
        break;
      }
      case "Escape":
        e.preventDefault();
        closePopover();
        break;
      case "Tab":
        // Let Tab close and move on naturally (focus returns via effect).
        closePopover(false);
        break;
      default:
        break;
    }
  };

  // Keep DOM focus synced to the focusedDay cell while the popover is open.
  useEffect(() => {
    if (!open || !view || focusedDay === null) return;
    const activeId = `${listboxId}-day-${focusedDay}`;
    const el = document.getElementById(activeId);
    el?.focus({ preventScroll: true });
  }, [open, view, focusedDay, listboxId]);

  const grid = useMemo(() => {
    if (!view) return null;
    const first = new Date(Date.UTC(view.y, view.m, 1));
    const pad = first.getUTCDay();
    const dim = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const todayParts = parts(todayIso);
    const valueParts = value ? parts(value) : null;

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < pad; i++) {
      cells.push(<span key={`pad-${i}`} aria-hidden="true" />);
    }
    for (let d = 1; d <= dim; d++) {
      const iso = isoFor(view.y, view.m, d);
      const disabledDay = isDisabled(iso);
      const isSelected = valueParts?.y === view.y && valueParts?.m === view.m && valueParts?.d === d;
      const isToday = todayParts?.y === view.y && todayParts?.m === view.m && todayParts?.d === d;
      const isFocused = focusedDay === d;

      cells.push(
        <button
          key={d}
          id={`${listboxId}-day-${d}`}
          type="button"
          role="gridcell"
          aria-selected={isSelected}
          aria-disabled={disabledDay || undefined}
          aria-current={isToday ? "date" : undefined}
          tabIndex={isFocused ? 0 : -1}
          disabled={disabledDay}
          onClick={() => select(iso)}
          className={`h-10 w-10 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-[#8a1630] text-white font-extrabold shadow-[0_6px_16px_-8px_rgba(138,22,48,0.8)]"
              : isToday
              ? "shadow-[inset_0_0_0_2px_#8a1630] text-[#1b1216] dark:text-[#f8ecee] font-extrabold"
              : disabledDay
              ? "text-[#c9b3b9] dark:text-[#6d5d63] line-through cursor-not-allowed"
              : "text-[#1b1216] dark:text-[#f8ecee] hover:bg-[#fbeff0] dark:hover:bg-[#3a1f29]"
          } ${isFocused ? "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]" : ""}`}
        >
          {d}
        </button>
      );
    }
    return cells;
  }, [view, focusedDay, value, todayIso, parts, isoFor, isDisabled, listboxId, select]);

  // Month boundaries must be compared in the same timestamp space as
  // minKey/maxKey (Manila midnight), so use parseManilaDate on civil dates.
  const firstOfView = view ? parseManilaDate(isoFor(view.y, view.m, 1))?.getTime() ?? null : null;
  const lastOfView = view
    ? parseManilaDate(isoFor(view.y, view.m, new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()))?.getTime() ?? null
    : null;
  const canGoPrev = view ? (minKey === null ? true : (firstOfView ?? 0) > minKey) : false;
  const canGoNext = view ? (maxKey === null ? true : (lastOfView ?? 0) < maxKey) : false;

  const shiftMonth = (delta: number) => {
    if (!view) return;
    const key = monthKey(view.y, view.m) + delta;
    setView({ y: Math.floor(key / 12), m: ((key % 12) + 12) % 12 });
    // Keep focus on an existing day of the new month.
    const dim = new Date(Date.UTC(Math.floor(key / 12), ((key % 12) + 12) % 12 + 1, 0)).getUTCDate();
    setFocusedDay((prev) => Math.min(prev ?? 1, dim));
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closePopover() : openPopover())}
        aria-haspopup="grid"
        aria-expanded={open}
        className={`inline-flex w-full max-w-[240px] items-center gap-2 rounded-xl bg-white dark:bg-[#2b1620] px-3.5 py-2.5 shadow-[inset_0_0_0_1.5px_rgba(138,22,48,0.18)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.18)] text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] disabled:opacity-50 disabled:cursor-not-allowed ${
          display ? "" : "text-[#8a7a80] dark:text-[#a89ba1]"
        }`}
      >
        <CalendarIcon className="w-4 h-4 shrink-0 text-[#8a1630] dark:text-[#de5572]" aria-hidden="true" />
        <span className="truncate">{display || placeholder}</span>
      </button>

      {open && view && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className="absolute z-40 mt-2 left-0 rounded-2xl border border-[#f3e6e9] dark:border-white/10 bg-white dark:bg-[#2b1620] p-4 shadow-[0_24px_48px_-24px_rgba(90,15,35,0.55)] w-[304px]"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className="w-9 h-9 grid place-items-center rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee] disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="font-display text-[15px] font-extrabold text-[#1b1216] dark:text-[#f8ecee]" aria-live="polite">
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={!canGoNext}
              aria-label="Next month"
              className="w-9 h-9 grid place-items-center rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee] disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Day-of-week headers + day grid */}
          <div role="grid" aria-label={ariaLabel} onKeyDown={onGridKeyDown} ref={gridRef}>
            <div role="row" className="grid grid-cols-7 mb-1">
              {DAY_HEADERS.map((d) => (
                <span
                  key={d}
                  role="columnheader"
                  className="text-center text-[11px] font-bold text-[#8a7a80] dark:text-[#a89ba1] py-1"
                >
                  {d}
                </span>
              ))}
            </div>
            <div role="row" className="grid grid-cols-7 gap-1 justify-items-center">
              {grid}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#f3e6e9] dark:border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
              Arrow keys move · Enter selects
            </span>
            <button
              type="button"
              onClick={() => closePopover()}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-extrabold text-[#8a1630] dark:text-[#de5572] hover:bg-[#fbeff0] dark:hover:bg-[#3a1f29] focus-visible:outline-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
