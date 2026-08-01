import { describe, expect, it } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { ImportTransaction } from "./csvImport";
import { IMPORT_WRITE_CHUNK_SIZE, transactionImportChunks } from "./repository";

function transaction(index: number, categoryId: string): ImportTransaction {
  return {
    id: `transaction-${index}`,
    sourceId: String(index),
    type: "expense",
    amountMinor: asMoneyAmount(100),
    categoryId,
    categoryLabelSnapshot: categoryId,
    dateKey: "2026-08-02",
    monthKey: "2026-08",
    note: "",
  };
}

describe("transactionImportChunks", () => {
  it("keeps each rules-sensitive write chunk within one category", () => {
    const transactions = Array.from({ length: 250 }, (_, index) =>
      transaction(index, `category-${index % 18}`),
    );

    const chunks = transactionImportChunks(transactions);

    expect(chunks.flat()).toHaveLength(transactions.length);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(IMPORT_WRITE_CHUNK_SIZE);
      expect(new Set(chunk.map((item) => item.categoryId)).size).toBe(1);
    }
  });

  it("splits a large category into Firestore-sized chunks", () => {
    const transactions = Array.from({ length: 201 }, (_, index) =>
      transaction(index, "one-category"),
    );

    expect(
      transactionImportChunks(transactions).map((chunk) => chunk.length),
    ).toEqual([100, 100, 1]);
  });
});
