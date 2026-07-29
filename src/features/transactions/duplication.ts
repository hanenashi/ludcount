import { toDateKey, toMonthKey } from "../../lib/dates";
import type { Transaction, TransactionDraft } from "./model";

export function createDuplicateDraft(
  transaction: Transaction,
  today: Date,
): TransactionDraft {
  const dateKey = toDateKey(today);
  return {
    type: transaction.type,
    amountMinor: transaction.amountMinor,
    categoryId: transaction.categoryId,
    dateKey,
    monthKey: toMonthKey(dateKey),
    note: transaction.note,
  };
}
