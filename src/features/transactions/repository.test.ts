import { describe, expect, it, vi } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { TransactionDraft } from "./model";
import {
  calculateTotals,
  createMemoryTransactionRepository,
} from "./repository";

const expense: TransactionDraft = {
  type: "expense",
  amountMinor: asMoneyAmount(85000),
  categoryId: "expense.groceries",
  dateKey: "2026-07-29",
  monthKey: "2026-07",
  note: "Weekly groceries",
};

describe("in-memory transaction repository", () => {
  it("creates, edits, and deletes a transaction", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
    const repository = createMemoryTransactionRepository();
    const created = repository.create(expense);
    expect(repository.list()).toHaveLength(1);

    repository.update(created.id, {
      ...expense,
      amountMinor: asMoneyAmount(90000),
    });
    expect(repository.list()[0].amountMinor).toBe(90000);

    repository.remove(created.id);
    expect(repository.list()).toEqual([]);
  });

  it("calculates income, expenses, and signed balance from integers", () => {
    const repository = createMemoryTransactionRepository();
    repository.create(expense);
    repository.create({
      ...expense,
      type: "income",
      amountMinor: asMoneyAmount(150000),
      categoryId: "income.salary",
    });

    expect(calculateTotals(repository.list())).toEqual({
      income: 150000,
      expenses: 85000,
      balanceMinor: 65000,
    });
  });
});
