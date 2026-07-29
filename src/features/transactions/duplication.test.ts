import { describe, expect, it } from "vitest";
import { asMoneyAmount } from "../../lib/money";
import type { Transaction } from "./model";
import { createDuplicateDraft } from "./duplication";

const source: Transaction = {
  id: "source",
  type: "expense",
  amountMinor: asMoneyAmount(85050),
  currency: "CZK",
  categoryId: "expense.groceries",
  categoryLabelSnapshot: "Potraviny",
  dateKey: "2026-06-01",
  monthKey: "2026-06",
  note: "Týdenní nákup",
  createdBy: "user",
  createdAt: 1,
  updatedAt: 1,
};

describe("transaction duplication", () => {
  it("copies editable values but defaults the date to today", () => {
    expect(createDuplicateDraft(source, new Date(2026, 6, 29))).toEqual({
      type: "expense",
      amountMinor: 85050,
      categoryId: "expense.groceries",
      dateKey: "2026-07-29",
      monthKey: "2026-07",
      note: "Týdenní nákup",
    });
  });

  it("does not include identity, currency, or timestamp fields", () => {
    expect(createDuplicateDraft(source, new Date(2026, 6, 29))).not.toEqual(
      expect.objectContaining({
        id: expect.anything(),
        createdBy: expect.anything(),
        createdAt: expect.anything(),
      }),
    );
  });
});
