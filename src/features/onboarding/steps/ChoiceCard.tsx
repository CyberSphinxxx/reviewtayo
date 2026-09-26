"use client";

import React from "react";
import { Check } from "lucide-react";

/**
 * Shared selectable card used by the onboarding steps. One active choice per
 * group, with a selected state that is clear beyond color (check icon +
 * bold ring) per the handoff's visual direction.
 */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  name,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  name: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-start gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
        selected
          ? "border-[#8a1630] bg-[#fbeff0] dark:bg-brand-950 shadow-sm"
          : "border-[#f0dfe3] bg-white dark:border-white/15 dark:bg-transparent hover:border-[#c99aa6] dark:hover:border-white/40"
      }`}
    >
      {icon && <span className="mt-0.5 shrink-0 text-[#8a1630] dark:text-[#ff9fb5]">{icon}</span>}
      <span className="block min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#1b1216] dark:text-[#f8ecee]">{title}</span>
          {selected && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#8a1630] text-white">
              <Check className="w-3 h-3" aria-hidden="true" />
            </span>
          )}
        </span>
        {description && (
          <span className="mt-0.5 block text-[13px] leading-snug text-[#5a4a50] dark:text-[#d6bcc3]">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

/** Primary continuation button, shared across steps. */
export function ContinueButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#8a1630] text-white font-bold text-[15px] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-10px_rgba(138,22,48,0.8)] transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
    >
      {label}
    </button>
  );
}
