import { isValidDateKey } from "../../lib/dates";
import { asMoneyAmount, MAX_AMOUNT_MINOR } from "../../lib/money";
import type {
  CustomCategory,
  Transaction,
  TransactionType,
} from "../transactions/model";

export const OKANE_RECO_COLUMNS = [
  "sourceApp",
  "sourceId",
  "date",
  "sourceTime",
  "type",
  "amountMinor",
  "currency",
  "categorySourceId",
  "category",
  "note",
  "sourcePaymentId",
  "sourceShopId",
] as const;

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10_000;

export type CsvImportErrorCode =
  | "empty-file"
  | "invalid-csv"
  | "missing-columns"
  | "too-many-rows"
  | "invalid-row"
  | "duplicate-source-id"
  | "inconsistent-category";

export class CsvImportError extends Error {
  constructor(
    readonly code: CsvImportErrorCode,
    readonly rowNumber?: number,
  ) {
    super(
      rowNumber
        ? `CSV import validation failed at row ${rowNumber}.`
        : "CSV import validation failed.",
    );
    this.name = "CsvImportError";
  }
}

export interface ImportCategory {
  id: string;
  sourceId: string;
  type: TransactionType;
  name: string;
  sortOrder: number;
}

export interface ImportTransaction {
  id: string;
  sourceId: string;
  type: TransactionType;
  amountMinor: ReturnType<typeof asMoneyAmount>;
  categoryId: string;
  categoryLabelSnapshot: string;
  dateKey: string;
  monthKey: string;
  note: string;
}

export interface CsvImportPlan {
  categories: readonly ImportCategory[];
  transactions: readonly ImportTransaction[];
  incomeCount: number;
  expenseCount: number;
  firstDate: string;
  lastDate: string;
}

export interface CsvImportPreview extends CsvImportPlan {
  categoriesToCreate: readonly ImportCategory[];
  transactionsToCreate: readonly ImportTransaction[];
  skippedTransactions: number;
  conflictingCategoryIds: readonly string[];
}

function parseDelimitedCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) throw new CsvImportError("invalid-csv");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function categoryDocumentId(type: TransactionType, sourceId: string): string {
  return `import-okane-reco-${type}-${sourceId}`;
}

export function transactionDocumentId(sourceId: string): string {
  return `import-okane-reco-${sourceId}`;
}

export function parseOkaneRecoCsv(input: string): CsvImportPlan {
  const text = input.replace(/^\uFEFF/, "");
  const rows = parseDelimitedCsv(text);
  if (rows.length === 0 || rows[0].every((field) => field.trim() === "")) {
    throw new CsvImportError("empty-file");
  }

  const headers = rows[0].map((header) => header.trim());
  if (OKANE_RECO_COLUMNS.some((required) => !headers.includes(required))) {
    throw new CsvImportError("missing-columns");
  }
  const dataRows = rows
    .slice(1)
    .filter((fields) => fields.some((field) => field.trim() !== ""));
  if (dataRows.length === 0) throw new CsvImportError("empty-file");
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new CsvImportError("too-many-rows");
  }

  const column = new Map(headers.map((header, index) => [header, index]));
  const value = (fields: readonly string[], name: string) =>
    fields[column.get(name) ?? -1] ?? "";
  const sourceIds = new Set<string>();
  const categories = new Map<string, ImportCategory>();
  const transactions: ImportTransaction[] = [];

  dataRows.forEach((fields, index) => {
    const rowNumber = index + 2;
    const sourceApp = value(fields, "sourceApp");
    const sourceId = value(fields, "sourceId");
    const dateKey = value(fields, "date");
    const type = value(fields, "type") as TransactionType;
    const amountText = value(fields, "amountMinor");
    const categorySourceId = value(fields, "categorySourceId");
    const categoryName = value(fields, "category").trim();
    const note = value(fields, "note");
    const amountMinor = Number(amountText);

    if (
      sourceApp !== "okane-reco" ||
      !/^\d{1,18}$/.test(sourceId) ||
      !/^\d{1,18}$/.test(categorySourceId) ||
      (type !== "income" && type !== "expense") ||
      !Number.isInteger(amountMinor) ||
      amountMinor <= 0 ||
      amountMinor > MAX_AMOUNT_MINOR ||
      value(fields, "currency") !== "CZK" ||
      !isValidDateKey(dateKey) ||
      categoryName.length === 0 ||
      categoryName.length > 60 ||
      note.length > 120
    ) {
      throw new CsvImportError("invalid-row", rowNumber);
    }
    if (sourceIds.has(sourceId)) {
      throw new CsvImportError("duplicate-source-id", rowNumber);
    }
    sourceIds.add(sourceId);

    const categoryId = categoryDocumentId(type, categorySourceId);
    const existingCategory = categories.get(categoryId);
    if (existingCategory && existingCategory.name !== categoryName) {
      throw new CsvImportError("inconsistent-category", rowNumber);
    }
    if (!existingCategory) {
      categories.set(categoryId, {
        id: categoryId,
        sourceId: categorySourceId,
        type,
        name: categoryName,
        sortOrder: 10_000 + categories.size,
      });
    }

    transactions.push({
      id: transactionDocumentId(sourceId),
      sourceId,
      type,
      amountMinor: asMoneyAmount(amountMinor),
      categoryId,
      categoryLabelSnapshot: categoryName,
      dateKey,
      monthKey: dateKey.slice(0, 7),
      note,
    });
  });

  const dates = transactions.map((transaction) => transaction.dateKey).sort();
  return {
    categories: [...categories.values()],
    transactions,
    incomeCount: transactions.filter(({ type }) => type === "income").length,
    expenseCount: transactions.filter(({ type }) => type === "expense").length,
    firstDate: dates[0],
    lastDate: dates.at(-1) ?? dates[0],
  };
}

export function previewCsvImport(
  plan: CsvImportPlan,
  existingTransactions: readonly Transaction[],
  existingCategories: readonly CustomCategory[],
): CsvImportPreview {
  const transactionIds = new Set(
    existingTransactions.map((transaction) => transaction.id),
  );
  const categories = new Map(
    existingCategories.map((category) => [category.id, category]),
  );
  const conflictingCategoryIds = plan.categories
    .filter((category) => {
      const existing = categories.get(category.id);
      return Boolean(
        existing && (existing.type !== category.type || existing.archived),
      );
    })
    .map((category) => category.id);

  return {
    ...plan,
    categoriesToCreate: plan.categories.filter(
      (category) => !categories.has(category.id),
    ),
    transactionsToCreate: plan.transactions.filter(
      (transaction) => !transactionIds.has(transaction.id),
    ),
    skippedTransactions: plan.transactions.filter((transaction) =>
      transactionIds.has(transaction.id),
    ).length,
    conflictingCategoryIds,
  };
}
