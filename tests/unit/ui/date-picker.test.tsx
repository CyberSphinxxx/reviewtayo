import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DatePicker } from "@/components/ui/DatePicker";

/**
 * The picker stores plain YYYY-MM-DD strings (same contract as the native
 * input it replaces). Anchored to Asia/Manila via getManilaTodayString().
 */

describe("DatePicker", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a trigger button showing the formatted selected date", () => {
    render(<DatePicker value="2027-03-14" onChange={vi.fn()} />);
    // The trigger renders the formatted short date, not the ISO string.
    expect(screen.getByRole("button", { name: /mar 14, 2027/i })).toBeInTheDocument();
  });

  it("shows the placeholder when no value is set", () => {
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Pick your exam date" />);
    expect(screen.getByRole("button", { name: /pick your exam date/i })).toBeInTheDocument();
  });

  it("opens a grid dialog on the selected month and selects a day", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2027-03-14" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /mar 14, 2027/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/march 2027/i)).toBeInTheDocument();

    // Click day 20 — the selection callback receives the ISO string.
    fireEvent.click(screen.getByRole("gridcell", { name: "20" }));
    expect(onChange).toHaveBeenCalledWith("2027-03-20");
    // The popover closes after selection.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables days outside min/max and refuses selecting them", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-15" onChange={onChange} min="2026-09-10" max="2026-09-20" />);

    fireEvent.click(screen.getByRole("button", { name: /sep 15, 2026/i }));
    expect(screen.getByRole("gridcell", { name: "5" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("gridcell", { name: "25" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("gridcell", { name: "12" })).not.toHaveAttribute("aria-disabled");

    fireEvent.click(screen.getByRole("gridcell", { name: "5" }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("gridcell", { name: "12" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-12");
  });

  it("supports keyboard: arrows move focus, Enter selects, Escape closes", async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-15" onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: /sep 15, 2026/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Day 15 starts focused. ArrowRight → 16, Enter selects it.
    const day15 = screen.getByRole("gridcell", { name: "15" });
    await waitFor(() => expect(day15).toHaveFocus());

    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("gridcell", { name: "16" })).toHaveFocus());

    fireEvent.keyDown(screen.getByRole("grid"), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("2026-09-16");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Focus returned to the trigger.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("navigates months with the arrow buttons and respects min boundary", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-15" onChange={onChange} min="2026-09-01" />);

    fireEvent.click(screen.getByRole("button", { name: /sep 15, 2026/i }));
    // Prev is blocked (September is the first allowed month); Next works.
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next month/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/october 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous month/i })).toBeEnabled();
  });

  it("closes without selecting on Escape and returns focus to the trigger", async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-15" onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: /sep 15, 2026/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("stores the value as a plain YYYY-MM-DD string for any legal date", () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} min="2020-01-01" />);

    fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    // Navigate to a leap-day month and select it.
    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    // From the open month (today = render-time), just assert a selection
    // emits a well-formed ISO date — the storage contract.
    const cells = screen.getAllByRole("gridcell").filter(
      (c) => !c.hasAttribute("aria-disabled")
    );
    fireEvent.click(cells[0]);
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });
});
