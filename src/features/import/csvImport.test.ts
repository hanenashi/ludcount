import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { asMoneyAmount } from "../../lib/money";
import type { CustomCategory, Transaction } from "../transactions/model";
import {
  CsvImportError,
  OKANE_RECO_COLUMNS,
  parseOkaneRecoCsv,
  previewCsvImport,
  transactionDocumentId,
} from "./csvImport";

function csvRow(values: readonly string[]): string {
  return values.map((value) => `"${value.replaceAll('"', '""')}"`).join(";");
}

function csv(
  overrides: Partial<Record<(typeof OKANE_RECO_COLUMNS)[number], string>> = {},
): string {
  const values = {
    sourceApp: "okane-reco",
    sourceId: "42",
    date: "2026-07-31",
    sourceTime: "18:02",
    type: "expense",
    amountMinor: "12550",
    currency: "CZK",
    categorySourceId: "7",
    category: "Potraviny",
    note: 'Pečivo; mléko "bio"\na ovoce',
    sourcePaymentId: "1",
    sourceShopId: "3",
    ...overrides,
  };
  return `\uFEFF${csvRow(OKANE_RECO_COLUMNS)}\r\n${csvRow(
    OKANE_RECO_COLUMNS.map((column) => values[column]),
  )}\r\n`;
}

describe("parseOkaneRecoCsv", () => {
  it("keeps the committed 20-row sample canonical and importable", () => {
    const sample = readFileSync(
      "examples/okane-reco-import-sample.csv",
      "utf8",
    );
    const plan = parseOkaneRecoCsv(sample);

    expect(sample.charCodeAt(0)).toBe(0xfeff);
    expect(plan.transactions).toHaveLength(20);
    expect(plan.incomeCount).toBe(5);
    expect(plan.expenseCount).toBe(15);
    expect(plan.firstDate).toBe("2026-06-03");
    expect(plan.lastDate).toBe("2026-08-02");
  });

  it("parses the canonical BOM CSV and preserves escaped Czech text", () => {
    const plan = parseOkaneRecoCsv(csv());

    expect(plan).toMatchObject({
      incomeCount: 0,
      expenseCount: 1,
      firstDate: "2026-07-31",
      lastDate: "2026-07-31",
    });
    expect(plan.categories[0]).toMatchObject({
      id: "import-okane-reco-expense-7",
      name: "Potraviny",
    });
    expect(plan.transactions[0]).toMatchObject({
      id: "import-okane-reco-42",
      amountMinor: 12550,
      note: 'Pečivo; mléko "bio"\na ovoce',
      monthKey: "2026-07",
    });
  });

  it.each([
    ["zero amount", { amountMinor: "0" }],
    ["floating amount", { amountMinor: "12.5" }],
    ["invalid date", { date: "2026-02-30" }],
    ["wrong currency", { currency: "JPY" }],
    ["wrong source", { sourceApp: "other" }],
  ])("rejects %s", (_name, overrides) => {
    expect(() => parseOkaneRecoCsv(csv(overrides))).toThrow(CsvImportError);
  });

  it("rejects duplicate source IDs", () => {
    const one = csv().trimEnd();
    const duplicate = one.slice(one.indexOf("\r\n") + 2);
    expect(() => parseOkaneRecoCsv(`${one}\r\n${duplicate}`)).toThrowError(
      expect.objectContaining({ code: "duplicate-source-id", rowNumber: 3 }),
    );
  });

  it("rejects inconsistent names for one source category", () => {
    const first = csv().trimEnd();
    const second = csvRow(
      OKANE_RECO_COLUMNS.map((column) => {
        if (column === "sourceId") return "43";
        if (column === "category") return "Jiné potraviny";
        const parsed = parseOkaneRecoCsv(csv());
        const transaction = parsed.transactions[0];
        const fallback: Record<string, string> = {
          sourceApp: "okane-reco",
          date: transaction.dateKey,
          sourceTime: "18:02",
          type: transaction.type,
          amountMinor: String(transaction.amountMinor),
          currency: "CZK",
          categorySourceId: "7",
          note: transaction.note,
          sourcePaymentId: "1",
          sourceShopId: "3",
        };
        return fallback[column] ?? "";
      }),
    );
    expect(() => parseOkaneRecoCsv(`${first}\r\n${second}`)).toThrowError(
      expect.objectContaining({ code: "inconsistent-category" }),
    );
  });
});

describe("previewCsvImport", () => {
  it("uses deterministic IDs and excludes existing documents", () => {
    const plan = parseOkaneRecoCsv(csv());
    const transaction = {
      id: transactionDocumentId("42"),
      type: "expense",
      amountMinor: asMoneyAmount(1),
    } as Transaction;
    const category = {
      id: "import-okane-reco-expense-7",
      type: "expense",
      archived: false,
    } as CustomCategory;

    const preview = previewCsvImport(plan, [transaction], [category]);
    expect(preview.transactionsToCreate).toHaveLength(0);
    expect(preview.categoriesToCreate).toHaveLength(0);
    expect(preview.skippedTransactions).toBe(1);
    expect(preview.conflictingCategoryIds).toEqual([]);
  });

  it("blocks an archived deterministic category", () => {
    const plan = parseOkaneRecoCsv(csv());
    const category = {
      id: "import-okane-reco-expense-7",
      type: "expense",
      archived: true,
    } as CustomCategory;
    expect(
      previewCsvImport(plan, [], [category]).conflictingCategoryIds,
    ).toEqual([category.id]);
  });
});
