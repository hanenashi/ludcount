import { describe, expect, it } from "vitest";
import { isValidDateKey, moveMonth, toDateKey, toMonthKey } from "./dates";

describe("date helpers", () => {
  it("creates a local calendar date without UTC conversion", () => {
    expect(toDateKey(new Date(2026, 6, 29, 23, 45))).toBe("2026-07-29");
  });

  it("validates real calendar dates", () => {
    expect(isValidDateKey("2024-02-29")).toBe(true);
    expect(isValidDateKey("2025-02-29")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
  });

  it("derives and navigates month keys across year boundaries", () => {
    expect(toMonthKey("2026-07-29")).toBe("2026-07");
    expect(moveMonth("2026-01", -1)).toBe("2025-12");
  });
});
