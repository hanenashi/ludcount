import type { TranslationKey } from "../../i18n/en";
import type { MoneyAmount } from "../../lib/money";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: MoneyAmount;
  currency: "CZK";
  categoryId: string;
  categoryLabelSnapshot: string;
  dateKey: string;
  monthKey: string;
  note: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type TransactionDraft = Pick<
  Transaction,
  "type" | "amountMinor" | "categoryId" | "dateKey" | "monthKey" | "note"
>;

export interface BuiltInCategory {
  id: string;
  type: TransactionType;
  labelKey: TranslationKey;
  source: "built-in";
  archived: false;
  sortOrder: number;
}

export interface CustomCategory {
  id: string;
  type: TransactionType;
  name: string;
  source: "custom";
  archived: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type Category = BuiltInCategory | CustomCategory;

const builtInDefinitions: ReadonlyArray<
  Pick<BuiltInCategory, "id" | "type" | "labelKey">
> = [
  {
    id: "expense.groceries",
    type: "expense",
    labelKey: "category.expense.groceries",
  },
  {
    id: "expense.housing",
    type: "expense",
    labelKey: "category.expense.housing",
  },
  {
    id: "expense.utilities",
    type: "expense",
    labelKey: "category.expense.utilities",
  },
  {
    id: "expense.transport",
    type: "expense",
    labelKey: "category.expense.transport",
  },
  {
    id: "expense.health",
    type: "expense",
    labelKey: "category.expense.health",
  },
  {
    id: "expense.drugstore",
    type: "expense",
    labelKey: "category.expense.drugstore",
  },
  {
    id: "expense.clothing",
    type: "expense",
    labelKey: "category.expense.clothing",
  },
  {
    id: "expense.restaurants",
    type: "expense",
    labelKey: "category.expense.restaurants",
  },
  {
    id: "expense.entertainment",
    type: "expense",
    labelKey: "category.expense.entertainment",
  },
  {
    id: "expense.gifts",
    type: "expense",
    labelKey: "category.expense.gifts",
  },
  {
    id: "expense.other",
    type: "expense",
    labelKey: "category.expense.other",
  },
  {
    id: "income.salary",
    type: "income",
    labelKey: "category.income.salary",
  },
  {
    id: "income.pension",
    type: "income",
    labelKey: "category.income.pension",
  },
  {
    id: "income.benefits",
    type: "income",
    labelKey: "category.income.benefits",
  },
  {
    id: "income.sale",
    type: "income",
    labelKey: "category.income.sale",
  },
  {
    id: "income.refund",
    type: "income",
    labelKey: "category.income.refund",
  },
  {
    id: "income.other",
    type: "income",
    labelKey: "category.income.other",
  },
];

export const builtInCategories: readonly BuiltInCategory[] =
  builtInDefinitions.map((category, sortOrder) => ({
    ...category,
    source: "built-in",
    archived: false,
    sortOrder,
  }));

export const categories = builtInCategories;

export function getBuiltInCategory(
  categoryId: string,
): BuiltInCategory | undefined {
  return builtInCategories.find((category) => category.id === categoryId);
}
