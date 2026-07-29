import type { Locale } from "../../i18n";
import type { Transaction } from "../transactions/model";

const UTF8_BOM = "\uFEFF";

export interface CsvLabels {
  date: string;
  type: string;
  amount: string;
  currency: string;
  category: string;
  note: string;
  income: string;
  expense: string;
  categoryFor: (transaction: Transaction) => string;
}

function escapeCsvField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatCsvAmount(
  amountMinor: Transaction["amountMinor"],
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function createTransactionsCsv(
  transactions: readonly Transaction[],
  locale: Locale,
  labels: CsvLabels,
): string {
  const rows = [
    [
      labels.date,
      labels.type,
      labels.amount,
      labels.currency,
      labels.category,
      labels.note,
    ],
    ...transactions.map((transaction) => [
      transaction.dateKey,
      transaction.type === "income" ? labels.income : labels.expense,
      formatCsvAmount(transaction.amountMinor, locale),
      transaction.currency,
      labels.categoryFor(transaction),
      transaction.note,
    ]),
  ];

  return (
    UTF8_BOM +
    rows
      .map((row) => row.map((value) => escapeCsvField(value)).join(";"))
      .join("\r\n")
  );
}

export function createTransactionsCsvFilename(monthKey: string): string {
  return `ludcount-${monthKey}.csv`;
}

export function downloadTransactionsCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
