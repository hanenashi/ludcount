import { describe, expect, it } from "vitest";
import {
  movePeriod,
  periodContainsDate,
  periodExportKey,
  periodLabel,
  periodRange,
  type PeriodSelection,
} from "./period";

describe("period selection", () => {
  it.each<PeriodSelection>([
    { mode: "month", monthKey: "2026-07" },
    { mode: "year", year: 2026 },
    { mode: "range", from: "2026-06-15", to: "2026-07-15" },
  ])("filters dates for $mode", (period) => {
    expect(periodContainsDate(period, "2026-07-01")).toBe(true);
    expect(periodContainsDate(period, "2025-07-01")).toBe(false);
  });

  it("moves month, year, and custom ranges by their natural interval", () => {
    expect(movePeriod({ mode: "month", monthKey: "2026-01" }, -1)).toEqual({
      mode: "month",
      monthKey: "2025-12",
    });
    expect(movePeriod({ mode: "year", year: 2026 }, 1)).toEqual({
      mode: "year",
      year: 2027,
    });
    expect(
      movePeriod({ mode: "range", from: "2026-07-01", to: "2026-07-07" }, 1),
    ).toEqual({ mode: "range", from: "2026-07-08", to: "2026-07-14" });
  });

  it("creates localized labels, complete bounds, and deterministic export keys", () => {
    const range = {
      mode: "range",
      from: "2026-07-01",
      to: "2026-07-31",
    } as const;
    expect(periodLabel({ mode: "year", year: 2026 }, "en")).toBe("2026");
    expect(periodRange({ mode: "month", monthKey: "2024-02" })).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
    expect(periodExportKey(range)).toBe("2026-07-01_to_2026-07-31");
  });
});
