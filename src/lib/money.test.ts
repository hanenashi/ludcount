import { describe, expect, it } from "vitest";
import {
  MAX_AMOUNT_MINOR,
  asMoneyAmount,
  defaultDisplayCurrency,
  displayCurrencySymbol,
  formatMoney,
  parseMoneyInput,
  resolveDisplayCurrency,
  sumMoney,
} from "./money";

describe("money helpers", () => {
  it("parses Czech, English, and Japanese decimal inputs into minor units", () => {
    expect(parseMoneyInput("1 234,56", "cs")).toBe(123456);
    expect(parseMoneyInput("1234.56", "en")).toBe(123456);
    expect(parseMoneyInput("1234.56", "ja")).toBe(123456);
  });

  it("rejects zero, negative, malformed, and excessive amounts", () => {
    expect(parseMoneyInput("0", "cs")).toBeNull();
    expect(parseMoneyInput("-10", "cs")).toBeNull();
    expect(parseMoneyInput("12,345", "cs")).toBeNull();
    expect(
      parseMoneyInput(String(MAX_AMOUNT_MINOR / 100 + 1), "en"),
    ).toBeNull();
  });

  it("aggregates integer minor units without currency floats", () => {
    expect(sumMoney([asMoneyAmount(12550), asMoneyAmount(250)])).toBe(12800);
  });

  it("formats only at the display boundary", () => {
    expect(formatMoney(asMoneyAmount(12550), "cs")).toContain("125,50");
    expect(formatMoney(asMoneyAmount(12550), "cs")).toContain("Kč");
    expect(formatMoney(asMoneyAmount(12550), "en")).toBe("$125.50");
    expect(formatMoney(asMoneyAmount(12550), "ja")).toBe("¥125.50");
    expect(formatMoney(asMoneyAmount(12550), "cs", "USD")).toBe("$125,50");
  });

  it("resolves locale defaults and persistent manual symbol overrides", () => {
    expect(defaultDisplayCurrency("cs")).toBe("CZK");
    expect(defaultDisplayCurrency("en")).toBe("USD");
    expect(defaultDisplayCurrency("ja")).toBe("JPY");
    expect(resolveDisplayCurrency("ja", "USD")).toBe("USD");
    expect(displayCurrencySymbol("CZK")).toBe("Kč");
  });
});
