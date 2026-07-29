import type { Transaction, TransactionType } from "./model";

export type TransactionTypeFilter = TransactionType | "all";

export interface TransactionFilters {
  monthKey: string;
  type: TransactionTypeFilter;
  categoryId: string;
  noteQuery: string;
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}

export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
): readonly Transaction[] {
  const noteQuery = normalizeSearchText(filters.noteQuery.trim());

  return transactions.filter(
    (transaction) =>
      transaction.monthKey === filters.monthKey &&
      (filters.type === "all" || transaction.type === filters.type) &&
      (filters.categoryId === "all" ||
        transaction.categoryId === filters.categoryId) &&
      (noteQuery.length === 0 ||
        normalizeSearchText(transaction.note).includes(noteQuery)),
  );
}

export function hasSecondaryFilters(
  filters: Pick<TransactionFilters, "type" | "categoryId" | "noteQuery">,
): boolean {
  return (
    filters.type !== "all" ||
    filters.categoryId !== "all" ||
    filters.noteQuery.trim().length > 0
  );
}
