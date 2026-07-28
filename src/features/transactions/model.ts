import type { TranslationKey } from "../../i18n/en";
import type { MoneyAmount } from "../../lib/money";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: MoneyAmount;
  currency: "CZK";
  categoryId: string;
  dateKey: string;
  monthKey: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type TransactionDraft = Pick<
  Transaction,
  "type" | "amountMinor" | "categoryId" | "dateKey" | "monthKey" | "note"
>;

export interface Category {
  id: string;
  type: TransactionType;
  labelKey: TranslationKey;
}

export const categories: readonly Category[] = [
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

export function getCategory(categoryId: string): Category | undefined {
  return categories.find((category) => category.id === categoryId);
}
