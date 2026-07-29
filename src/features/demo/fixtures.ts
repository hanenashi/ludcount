import { moveMonth, monthKeyFromDate } from "../../lib/dates";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction } from "../transactions/model";

function fixtureTransaction(
  id: string,
  values: Pick<
    Transaction,
    "type" | "amountMinor" | "categoryId" | "categoryLabelSnapshot" | "note"
  > & { monthKey: string; day: number; order: number },
): Transaction {
  const dateKey = `${values.monthKey}-${String(values.day).padStart(2, "0")}`;
  return {
    id,
    type: values.type,
    amountMinor: values.amountMinor,
    currency: "CZK",
    categoryId: values.categoryId,
    categoryLabelSnapshot: values.categoryLabelSnapshot,
    dateKey,
    monthKey: values.monthKey,
    note: values.note,
    createdBy: "demo-fixture",
    createdAt: values.order,
    updatedAt: values.order,
  };
}

export function createDemoFixture(now = new Date()): readonly Transaction[] {
  const currentMonth = monthKeyFromDate(now);
  const previousMonth = moveMonth(currentMonth, -1);

  return [
    fixtureTransaction("demo-salary", {
      type: "income",
      amountMinor: asMoneyAmount(4_850_000),
      categoryId: "income.salary",
      categoryLabelSnapshot: "Výplata",
      monthKey: currentMonth,
      day: 5,
      note: "Ukázková měsíční výplata",
      order: 8,
    }),
    fixtureTransaction("demo-housing", {
      type: "expense",
      amountMinor: asMoneyAmount(1_650_000),
      categoryId: "expense.housing",
      categoryLabelSnapshot: "Bydlení",
      monthKey: currentMonth,
      day: 6,
      note: "Nájem ukázkové domácnosti",
      order: 7,
    }),
    fixtureTransaction("demo-groceries", {
      type: "expense",
      amountMinor: asMoneyAmount(186_450),
      categoryId: "expense.groceries",
      categoryLabelSnapshot: "Potraviny",
      monthKey: currentMonth,
      day: 12,
      note: "Víkendový nákup",
      order: 6,
    }),
    fixtureTransaction("demo-utilities", {
      type: "expense",
      amountMinor: asMoneyAmount(312_000),
      categoryId: "expense.utilities",
      categoryLabelSnapshot: "Energie",
      monthKey: currentMonth,
      day: 14,
      note: "Elektřina a voda",
      order: 5,
    }),
    fixtureTransaction("demo-transport", {
      type: "expense",
      amountMinor: asMoneyAmount(55_000),
      categoryId: "expense.transport",
      categoryLabelSnapshot: "Doprava",
      monthKey: currentMonth,
      day: 18,
      note: "Měsíční jízdenka",
      order: 4,
    }),
    fixtureTransaction("demo-restaurant", {
      type: "expense",
      amountMinor: asMoneyAmount(89_900),
      categoryId: "expense.restaurants",
      categoryLabelSnapshot: "Restaurace",
      monthKey: currentMonth,
      day: 22,
      note: "Fiktivní rodinný oběd",
      order: 3,
    }),
    fixtureTransaction("demo-sale", {
      type: "income",
      amountMinor: asMoneyAmount(240_000),
      categoryId: "income.sale",
      categoryLabelSnapshot: "Prodej",
      monthKey: previousMonth,
      day: 10,
      note: "Prodej starého stolku",
      order: 2,
    }),
    fixtureTransaction("demo-health", {
      type: "expense",
      amountMinor: asMoneyAmount(72_500),
      categoryId: "expense.health",
      categoryLabelSnapshot: "Zdraví",
      monthKey: previousMonth,
      day: 16,
      note: "Lékárna",
      order: 1,
    }),
  ];
}
