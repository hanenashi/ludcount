import { asMoneyAmount, type MoneyAmount } from "../../lib/money";
import type { Transaction, TransactionDraft } from "./model";

export interface TransactionSnapshot {
  transactions: readonly Transaction[];
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface TransactionRepository {
  subscribe(
    onData: (snapshot: TransactionSnapshot) => void,
    onError: (error: Error) => void,
  ): () => void;
  create(
    draft: TransactionDraft,
    categoryLabelSnapshot: string,
  ): Promise<string>;
  update(
    id: string,
    draft: TransactionDraft,
    categoryLabelSnapshot: string,
  ): Promise<void>;
  remove(id: string): Promise<void>;
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
