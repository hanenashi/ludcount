import { Timestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { DataOperationError } from "./errors";
import { transactionConverter, userProfileConverter } from "./converters";

function createSnapshot(
  id: string,
  path: string,
  data: Record<string, unknown>,
): QueryDocumentSnapshot {
  return {
    id,
    ref: { path },
    data: () => data,
  } as unknown as QueryDocumentSnapshot;
}

describe("Firestore converters", () => {
  it("converts a valid transaction while preserving integer minor units and date keys", () => {
    const snapshot = createSnapshot(
      "transaction-1",
      "households/home/transactions/transaction-1",
      {
        type: "expense",
        amountMinor: 85050,
        currency: "CZK",
        categoryId: "expense.groceries",
        categoryLabelSnapshot: "Potraviny",
        dateKey: "2026-07-29",
        monthKey: "2026-07",
        note: "Weekly groceries",
        createdBy: "user-1",
        createdAt: Timestamp.fromMillis(1000),
        updatedAt: Timestamp.fromMillis(2000),
      },
    );

    expect(transactionConverter.fromFirestore(snapshot)).toEqual({
      id: "transaction-1",
      type: "expense",
      amountMinor: 85050,
      currency: "CZK",
      categoryId: "expense.groceries",
      categoryLabelSnapshot: "Potraviny",
      dateKey: "2026-07-29",
      monthKey: "2026-07",
      note: "Weekly groceries",
      createdBy: "user-1",
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it("rejects floating-point amounts and mismatched month keys", () => {
    const snapshot = createSnapshot(
      "invalid",
      "households/home/transactions/invalid",
      {
        type: "expense",
        amountMinor: 10.5,
        currency: "CZK",
        categoryId: "expense.other",
        categoryLabelSnapshot: "Other",
        dateKey: "2026-07-29",
        monthKey: "2026-08",
        note: "",
        createdBy: "user-1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    );

    expect(() => transactionConverter.fromFirestore(snapshot)).toThrow(
      DataOperationError,
    );
  });

  it("validates persisted locale and active household preferences", () => {
    const snapshot = createSnapshot("user-1", "users/user-1", {
      displayName: "Ludva",
      email: "ludva@example.test",
      locale: "cs",
      activeHouseholdId: "home-1",
      createdAt: Timestamp.fromMillis(1000),
      updatedAt: Timestamp.fromMillis(2000),
    });

    expect(userProfileConverter.fromFirestore(snapshot)).toMatchObject({
      id: "user-1",
      locale: "cs",
      activeHouseholdId: "home-1",
    });
  });
});
