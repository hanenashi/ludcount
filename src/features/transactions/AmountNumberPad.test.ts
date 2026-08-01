import { describe, expect, it } from "vitest";
import { updateAmountFromPad } from "./amountPad";

describe("amount number pad", () => {
  it("builds Czech decimal amounts and limits fractions to two digits", () => {
    let amount = "";
    for (const key of ["1", "2", "3", "decimal", "4", "5", "6"] as const) {
      amount = updateAmountFromPad(amount, key, "cs");
    }
    expect(amount).toBe("123,45");
  });

  it("uses a decimal point for English and Japanese", () => {
    expect(updateAmountFromPad("12", "decimal", "en")).toBe("12.");
    expect(updateAmountFromPad("12", "decimal", "ja")).toBe("12.");
  });

  it("supports leading decimals, replacement, and backspace", () => {
    expect(updateAmountFromPad("", "decimal", "cs")).toBe("0,");
    expect(updateAmountFromPad("0", "5", "cs")).toBe("5");
    expect(updateAmountFromPad("abc", "5", "cs")).toBe("5");
    expect(updateAmountFromPad("125,50", "backspace", "cs")).toBe("125,5");
  });
});
