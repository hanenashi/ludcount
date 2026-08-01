import type { Locale } from "../../i18n";
import { formatDateKey, formatMonthKey } from "../../lib/dates";
import { periodContainsDate, type PeriodSelection } from "../period/period";
import type { Transaction } from "../transactions/model";

export interface GraphBucket {
  key: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shouldUseDailyBuckets(period: PeriodSelection): boolean {
  if (period.mode === "month") return true;
  if (period.mode === "year") return false;
  const days =
    Math.round(
      (dateFromKey(period.to).getTime() - dateFromKey(period.from).getTime()) /
        86_400_000,
    ) + 1;
  return days <= 62;
}

export function createGraphBuckets(
  transactions: readonly Transaction[],
  period: PeriodSelection,
  locale: Locale,
): readonly GraphBucket[] {
  const daily = shouldUseDailyBuckets(period);
  const buckets = new Map<string, Omit<GraphBucket, "key" | "label">>();

  for (const transaction of transactions) {
    if (!periodContainsDate(period, transaction.dateKey)) continue;
    const key = daily ? transaction.dateKey : transaction.monthKey;
    const bucket = buckets.get(key) ?? { incomeMinor: 0, expenseMinor: 0 };
    if (transaction.type === "income")
      bucket.incomeMinor += transaction.amountMinor;
    else bucket.expenseMinor += transaction.amountMinor;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, values]) => ({
      key,
      label: daily ? formatDateKey(key, locale) : formatMonthKey(key, locale),
      ...values,
    }));
}
