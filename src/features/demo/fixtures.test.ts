import { describe, expect, it } from "vitest";
import { createDemoFixture } from "./fixtures";

describe("demo fixture", () => {
  it("contains fictional integer income and expenses across months", () => {
    const transactions = createDemoFixture(new Date(2026, 6, 29));

    expect(
      new Set(transactions.map((transaction) => transaction.monthKey)),
    ).toEqual(new Set(["2026-07", "2026-06"]));
    expect(
      transactions.some((transaction) => transaction.type === "income"),
    ).toBe(true);
    expect(
      transactions.some((transaction) => transaction.type === "expense"),
    ).toBe(true);
    expect(
      transactions.every(
        (transaction) =>
          Number.isInteger(transaction.amountMinor) &&
          transaction.amountMinor > 0 &&
          transaction.createdBy === "demo-fixture",
      ),
    ).toBe(true);
  });
});
