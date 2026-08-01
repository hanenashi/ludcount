import { describe, expect, it } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction } from "../transactions/model";
import { createCategoryBreakdowns, createGraphBuckets } from "./graphData";

function transaction(
  id: string,
  dateKey: string,
  type: "income" | "expense",
  amountMinor: number,
  categoryId = type === "income" ? "income.other" : "expense.other",
  categoryLabelSnapshot = "Other",
): Transaction {
  return {
    id,
    dateKey,
    monthKey: dateKey.slice(0, 7),
    type,
    amountMinor: asMoneyAmount(amountMinor),
    currency: "CZK",
    categoryId,
    categoryLabelSnapshot,
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

  it("aggregates category shares for the selected period and direction", () => {
    const breakdowns = createCategoryBreakdowns(
      [
        transaction(
          "salary",
          "2026-01-02",
          "income",
          10000,
          "salary",
          "Salary",
        ),
        transaction("rent-one", "2026-01-03", "expense", 6000, "rent", "Rent"),
        transaction("rent-two", "2026-01-04", "expense", 2000, "rent", "Rent"),
        transaction("food", "2026-01-05", "expense", 2000, "food", "Food"),
        transaction("later", "2026-02-01", "expense", 9000, "later", "Later"),
      ],
      { mode: "month", monthKey: "2026-01" },
      (item) => item.categoryLabelSnapshot,
      "Other",
    );

    expect(breakdowns.income).toMatchObject({
      totalMinor: 10000,
      slices: [{ id: "salary", amountMinor: 10000, percentage: 100 }],
    });
    expect(breakdowns.expense.totalMinor).toBe(10000);
    expect(breakdowns.expense.slices.map((slice) => slice.id)).toEqual([
      "rent",
      "food",
    ]);
    expect(breakdowns.expense.slices.map((slice) => slice.percentage)).toEqual([
      80, 20,
    ]);
  });

  it("groups slices below five percent and caps crowded pies at six slices", () => {
    const breakdowns = createCategoryBreakdowns(
      [
        transaction("large", "2026-01-01", "expense", 8000, "large", "Large"),
        transaction(
          "small-one",
          "2026-01-02",
          "expense",
          300,
          "small-one",
          "Small one",
        ),
        transaction(
          "small-two",
          "2026-01-03",
          "expense",
          200,
          "small-two",
          "Small two",
        ),
        ...Array.from({ length: 7 }, (_, index) =>
          transaction(
            `equal-${index}`,
            "2026-01-04",
            "income",
            1000,
            `equal-${index}`,
            `Equal ${index}`,
          ),
        ),
      ],
      { mode: "month", monthKey: "2026-01" },
      (item) => item.categoryLabelSnapshot,
      "Grouped other",
    );

    expect(breakdowns.expense.slices).toHaveLength(2);
    expect(breakdowns.expense.slices[1]).toMatchObject({
      id: "__grouped_other__",
      label: "Grouped other",
      amountMinor: 500,
      grouped: true,
    });
    expect(breakdowns.income.slices).toHaveLength(6);
    expect(breakdowns.income.slices.at(-1)).toMatchObject({
      id: "__grouped_other__",
      amountMinor: 2000,
    });
  });
});
