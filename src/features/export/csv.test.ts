import { describe, expect, it } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction } from "../transactions/model";
import {
  createTransactionsCsv,
  createTransactionsCsvFilename,
  type CsvLabels,
} from "./csv";

const labels: CsvLabels = {
  date: "Datum",
  type: "Typ",
  amount: "Částka",
  currency: "Měna",
  category: "Kategorie",
  note: "Poznámka",
  income: "Příjem",
  expense: "Výdaj",
  categoryFor: (transaction) => transaction.categoryLabelSnapshot,
};

const baseTransaction: Transaction = {
  id: "transaction",
  type: "expense",
  amountMinor: asMoneyAmount(85050),
  currency: "CZK",
  categoryId: "expense.groceries",
  categoryLabelSnapshot: "Potraviny; běžné",
  dateKey: "2026-07-29",
  monthKey: "2026-07",
  note: 'Rohlíky; "čerstvé"\nMléko',
  createdBy: "user",
  createdAt: 1,
  updatedAt: 1,
};

describe("CSV export", () => {
  it("uses a UTF-8 BOM, semicolons, localized headers, and Czech decimals", () => {
    const csv = createTransactionsCsv([baseTransaction], "cs", labels);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(
      '"Datum";"Typ";"Částka";"Měna";"Kategorie";"Poznámka"',
    );
    expect(csv).toContain('"850,50"');
    expect(csv).toContain('"Potraviny; běžné"');
  });

  it("escapes quotes, semicolons, line breaks, Czech characters, and empty notes", () => {
    const csv = createTransactionsCsv(
      [
        baseTransaction,
        {
          ...baseTransaction,
          id: "empty-note",
          note: "",
        },
      ],
      "cs",
      labels,
    );

    expect(csv).toContain('"Rohlíky; ""čerstvé""\nMléko"');
    expect(csv).toContain('"Potraviny; běžné"');
    expect(csv.endsWith('""')).toBe(true);
  });

  it("uses an English decimal point and deterministic month filename", () => {
    const csv = createTransactionsCsv([baseTransaction], "en", {
      ...labels,
      amount: "Amount",
    });

    expect(csv).toContain('"850.50"');
    expect(createTransactionsCsvFilename("2026-07")).toBe(
      "ludcount-2026-07.csv",
    );
  });
});
