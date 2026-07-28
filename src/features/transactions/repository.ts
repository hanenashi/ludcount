import { asMoneyAmount, type MoneyAmount } from "../../lib/money";
import type { Transaction, TransactionDraft } from "./model";

export interface TransactionRepository {
  list(): readonly Transaction[];
  create(draft: TransactionDraft): Transaction;
  update(id: string, draft: TransactionDraft): Transaction;
  remove(id: string): void;
}

export function createMemoryTransactionRepository(
  initial: readonly Transaction[] = [],
): TransactionRepository {
  let transactions = [...initial];

  return {
    list: () =>
      [...transactions].sort(
        (left, right) =>
          right.dateKey.localeCompare(left.dateKey) ||
          right.createdAt - left.createdAt,
      ),
    create: (draft) => {
      const now = Date.now();
      const transaction: Transaction = {
        ...draft,
        id: crypto.randomUUID(),
        currency: "CZK",
        createdAt: now,
        updatedAt: now,
      };
      transactions = [...transactions, transaction];
      return transaction;
    },
    update: (id, draft) => {
      const current = transactions.find((transaction) => transaction.id === id);
      if (!current) {
        throw new Error(`Transaction ${id} does not exist.`);
      }
      const updated: Transaction = {
        ...current,
        ...draft,
        updatedAt: Date.now(),
      };
      transactions = transactions.map((transaction) =>
        transaction.id === id ? updated : transaction,
      );
      return updated;
    },
    remove: (id) => {
      transactions = transactions.filter(
        (transaction) => transaction.id !== id,
      );
    },
  };
}

export interface TransactionTotals {
  income: MoneyAmount;
  expenses: MoneyAmount;
  balanceMinor: number;
}

export function calculateTotals(
  transactions: readonly Transaction[],
): TransactionTotals {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

  return {
    income: asMoneyAmount(income),
    expenses: asMoneyAmount(expenses),
    balanceMinor: income - expenses,
  };
}
