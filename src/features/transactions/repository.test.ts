import { describe, expect, it, vi } from "vitest";
import { DemoTransactionRepository } from "../demo/DemoTransactionRepository";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction, TransactionDraft } from "./model";
import { calculateTotals } from "./repository";

const expense: TransactionDraft = {
  type: "expense",
  amountMinor: asMoneyAmount(85000),
  categoryId: "expense.groceries",
  dateKey: "2026-07-29",
  monthKey: "2026-07",
  note: "Weekly groceries",
};

function fixture(): readonly Transaction[] {
  return [];
}

describe("demo transaction repository", () => {
  it("creates, edits, and deletes a transaction in memory", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
    const repository = new DemoTransactionRepository(fixture);
    const createdId = await repository.create(expense, "Potraviny");
    expect(repository.snapshotForTesting()).toHaveLength(1);

    await repository.update(
      createdId,
      {
        ...expense,
        amountMinor: asMoneyAmount(90000),
      },
      "Potraviny",
    );
    expect(repository.snapshotForTesting()[0].amountMinor).toBe(90000);

    await repository.remove(createdId);
    expect(repository.snapshotForTesting()).toEqual([]);
  });

  it("resets every mutation to a fresh fixture snapshot", async () => {
    const original: Transaction = {
      ...expense,
      id: "fixture",
      currency: "CZK",
      categoryLabelSnapshot: "Potraviny",
      createdBy: "demo-fixture",
      createdAt: 1,
      updatedAt: 1,
    };
    const repository = new DemoTransactionRepository(() => [original]);
    await repository.remove(original.id);
    expect(repository.snapshotForTesting()).toEqual([]);

    repository.reset();
    expect(repository.snapshotForTesting()).toEqual([original]);
  });

  it("calculates income, expenses, and signed balance from integers", () => {
    const transactions: readonly Transaction[] = [
      {
        ...expense,
        id: "expense",
        currency: "CZK",
        categoryLabelSnapshot: "Potraviny",
        createdBy: "demo-fixture",
        createdAt: 1,
        updatedAt: 1,
      },
      {
        ...expense,
        id: "income",
        type: "income",
        amountMinor: asMoneyAmount(150000),
        currency: "CZK",
        categoryId: "income.salary",
        categoryLabelSnapshot: "Výplata",
        createdBy: "demo-fixture",
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    expect(calculateTotals(transactions)).toEqual({
      income: 150000,
      expenses: 85000,
      balanceMinor: 65000,
    });
  });
});
