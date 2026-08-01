import { describe, expect, it } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction } from "../transactions/model";
import { createGraphBuckets } from "./graphData";

function transaction(
  id: string,
  dateKey: string,
  type: "income" | "expense",
  amountMinor: number,
): Transaction {
  return {
    id,
    dateKey,
    monthKey: dateKey.slice(0, 7),
    type,
    amountMinor: asMoneyAmount(amountMinor),
    currency: "CZK",
    categoryId: type === "income" ? "income.other" : "expense.other",
    categoryLabelSnapshot: "Other",
    note: "",
    createdBy: "user",
    createdAt: 1,
    updatedAt: 1,
  };
}

const transactions = [
  transaction("one", "2026-01-05", "income", 10000),
  transaction("two", "2026-01-05", "expense", 2500),
  transaction("three", "2026-02-10", "expense", 3000),
];

describe("graph data", () => {
  it("uses daily buckets for a month and combines transaction directions", () => {
    expect(
      createGraphBuckets(
        transactions,
        { mode: "month", monthKey: "2026-01" },
        "en",
      ).map(({ key, incomeMinor, expenseMinor }) => ({
        key,
        incomeMinor,
        expenseMinor,
      })),
    ).toEqual([{ key: "2026-01-05", incomeMinor: 10000, expenseMinor: 2500 }]);
  });

  it("uses monthly buckets for years and long custom ranges", () => {
    expect(
      createGraphBuckets(transactions, { mode: "year", year: 2026 }, "en").map(
        (bucket) => bucket.key,
      ),
    ).toEqual(["2026-01", "2026-02"]);
    expect(
      createGraphBuckets(
        transactions,
        { mode: "range", from: "2026-01-01", to: "2026-12-31" },
        "en",
      ).map((bucket) => bucket.key),
    ).toEqual(["2026-01", "2026-02"]);
  });
});
