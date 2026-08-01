import type { Locale } from "../../i18n";
import { formatDateKey, formatMonthKey } from "../../lib/dates";
import { periodContainsDate, type PeriodSelection } from "../period/period";
import type { Transaction, TransactionType } from "../transactions/model";

export interface GraphBucket {
  key: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

export interface CategorySlice {
  id: string;
  label: string;
  amountMinor: number;
  percentage: number;
  grouped: boolean;
}

export interface CategoryBreakdown {
  totalMinor: number;
  slices: readonly CategorySlice[];
}

export interface CategoryBreakdowns {
  income: CategoryBreakdown;
  expense: CategoryBreakdown;
}

const MIN_VISIBLE_SHARE = 0.05;
const MAX_VISIBLE_SLICES = 6;

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

function createCategoryBreakdown(
  values: ReadonlyMap<string, { label: string; amountMinor: number }>,
  otherLabel: string,
): CategoryBreakdown {
  const entries = [...values.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort(
      (left, right) =>
        right.amountMinor - left.amountMinor ||
        left.label.localeCompare(right.label),
    );
  const totalMinor = entries.reduce(
    (total, entry) => total + entry.amountMinor,
    0,
  );
  if (totalMinor === 0) return { totalMinor, slices: [] };

  const largeEntries = entries.filter(
    (entry) => entry.amountMinor / totalMinor >= MIN_VISIBLE_SHARE,
  );
  const hasSmallEntries = largeEntries.length < entries.length;
  const needsGroupedSlice =
    hasSmallEntries || largeEntries.length > MAX_VISIBLE_SLICES;
  const detailedLimit = needsGroupedSlice
    ? MAX_VISIBLE_SLICES - 1
    : MAX_VISIBLE_SLICES;
  const detailedEntries = (
    largeEntries.length > 0 ? largeEntries : entries
  ).slice(0, detailedLimit);
  const detailedIds = new Set(detailedEntries.map((entry) => entry.id));
  const groupedMinor = entries.reduce(
    (total, entry) =>
      detailedIds.has(entry.id) ? total : total + entry.amountMinor,
    0,
  );
  const displayed = [
    ...detailedEntries.map((entry) => ({ ...entry, grouped: false })),
    ...(groupedMinor > 0
      ? [
          {
            id: "__grouped_other__",
            label: otherLabel,
            amountMinor: groupedMinor,
            grouped: true,
          },
        ]
      : []),
  ];

  return {
    totalMinor,
    slices: displayed.map((entry) => ({
      ...entry,
      percentage: (entry.amountMinor / totalMinor) * 100,
    })),
  };
}

export function createCategoryBreakdowns(
  transactions: readonly Transaction[],
  period: PeriodSelection,
  labelFor: (transaction: Transaction) => string,
  otherLabel: string,
): CategoryBreakdowns {
  const values: Record<
    TransactionType,
    Map<string, { label: string; amountMinor: number }>
  > = {
    income: new Map(),
    expense: new Map(),
  };

  for (const transaction of transactions) {
    if (!periodContainsDate(period, transaction.dateKey)) continue;
    const typeValues = values[transaction.type];
    const existing = typeValues.get(transaction.categoryId);
    typeValues.set(transaction.categoryId, {
      label: labelFor(transaction),
      amountMinor: (existing?.amountMinor ?? 0) + transaction.amountMinor,
    });
  }

  return {
    income: createCategoryBreakdown(values.income, otherLabel),
    expense: createCategoryBreakdown(values.expense, otherLabel),
  };
}
