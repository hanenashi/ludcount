import { describe, expect, it } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction } from "./model";
import { filterTransactions, hasSecondaryFilters } from "./filters";

const transactions: readonly Transaction[] = [
  {
    id: "groceries",
    type: "expense",
    amountMinor: asMoneyAmount(85050),
    currency: "CZK",
    categoryId: "expense.groceries",
    categoryLabelSnapshot: "Potraviny",
    dateKey: "2026-07-29",
    monthKey: "2026-07",
    note: "Týdenní NÁKUP",
    createdBy: "user",
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "transport",
    type: "expense",
    amountMinor: asMoneyAmount(3000),
    currency: "CZK",
    categoryId: "expense.transport",
    categoryLabelSnapshot: "Doprava",
    dateKey: "2026-07-28",
    monthKey: "2026-07",
    note: "Jízdenka",
    createdBy: "user",
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: "salary",
    type: "income",
    amountMinor: asMoneyAmount(5000000),
    currency: "CZK",
    categoryId: "income.salary",
    categoryLabelSnapshot: "Výplata",
    dateKey: "2026-07-15",
    monthKey: "2026-07",
    note: "Červencová výplata",
    createdBy: "user",
    createdAt: 3,
    updatedAt: 3,
  },
  {
    id: "older-groceries",
    type: "expense",
    amountMinor: asMoneyAmount(40000),
    currency: "CZK",
    categoryId: "expense.groceries",
    categoryLabelSnapshot: "Potraviny",
    dateKey: "2026-06-20",
    monthKey: "2026-06",
    note: "Starší nákup",
    createdBy: "user",
    createdAt: 4,
    updatedAt: 4,
  },
];

describe("transaction filters", () => {
  it("combines month, type, category, and note filters", () => {
    expect(
      filterTransactions(transactions, {
        period: { mode: "month", monthKey: "2026-07" },
        type: "expense",
        categoryId: "expense.groceries",
        noteQuery: "NÁKUP",
      }).map((transaction) => transaction.id),
    ).toEqual(["groceries"]);
  });

  it("filters month independently and combines incompatible filters to empty", () => {
    expect(
      filterTransactions(transactions, {
        period: { mode: "month", monthKey: "2026-06" },
        type: "all",
        categoryId: "all",
        noteQuery: "",
      }).map((transaction) => transaction.id),
    ).toEqual(["older-groceries"]);

    expect(
      filterTransactions(transactions, {
        period: { mode: "month", monthKey: "2026-07" },
        type: "income",
        categoryId: "expense.groceries",
        noteQuery: "",
      }),
    ).toEqual([]);
  });

  it("searches notes case-insensitively with Czech characters", () => {
    expect(
      filterTransactions(transactions, {
        period: { mode: "month", monthKey: "2026-07" },
        type: "all",
        categoryId: "all",
        noteQuery: "čErVeNcOvÁ",
      }).map((transaction) => transaction.id),
    ).toEqual(["salary"]);
  });

  it("combines year and custom date ranges with secondary filters", () => {
    expect(
      filterTransactions(transactions, {
        period: { mode: "year", year: 2026 },
        type: "income",
        categoryId: "all",
        noteQuery: "",
      }).map((transaction) => transaction.id),
    ).toEqual(["salary"]);
    expect(
      filterTransactions(transactions, {
        period: { mode: "range", from: "2026-06-21", to: "2026-07-28" },
        type: "expense",
        categoryId: "all",
        noteQuery: "",
      }).map((transaction) => transaction.id),
    ).toEqual(["transport"]);
  });

  it("detects filters that can be reset separately from month", () => {
    expect(
      hasSecondaryFilters({
        type: "all",
        categoryId: "all",
        noteQuery: "  ",
      }),
    ).toBe(false);
    expect(
      hasSecondaryFilters({
        type: "expense",
        categoryId: "all",
        noteQuery: "",
      }),
    ).toBe(true);
  });
});
