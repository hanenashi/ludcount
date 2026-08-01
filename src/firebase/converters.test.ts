import { Timestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { DataOperationError } from "./errors";
import {
  customCategoryConverter,
  transactionConverter,
  userProfileConverter,
} from "./converters";

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
      locale: "ja",
      displayCurrency: "USD",
      activeHouseholdId: "home-1",
      createdAt: Timestamp.fromMillis(1000),
      updatedAt: Timestamp.fromMillis(2000),
    });

    expect(userProfileConverter.fromFirestore(snapshot)).toMatchObject({
      id: "user-1",
      locale: "ja",
      displayCurrency: "USD",
      activeHouseholdId: "home-1",
    });
  });

  it("defaults legacy profiles to automatic display currency", () => {
    const snapshot = createSnapshot("user-1", "users/user-1", {
      displayName: "Ludva",
      email: "ludva@example.test",
      locale: "en",
      activeHouseholdId: "home-1",
      createdAt: Timestamp.fromMillis(1000),
      updatedAt: Timestamp.fromMillis(2000),
    });

    expect(userProfileConverter.fromFirestore(snapshot).displayCurrency).toBe(
      "auto",
    );
  });

  it("converts a valid custom category", () => {
    const snapshot = createSnapshot(
      "custom-1",
      "households/home/categories/custom-1",
      {
        name: "ペット",
        type: "expense",
        sortOrder: 1000,
        archived: false,
        createdBy: "user-1",
        createdAt: Timestamp.fromMillis(1000),
        updatedAt: Timestamp.fromMillis(2000),
      },
    );
    expect(customCategoryConverter.fromFirestore(snapshot)).toEqual({
      id: "custom-1",
      name: "ペット",
      type: "expense",
      sortOrder: 1000,
      archived: false,
      source: "custom",
      createdBy: "user-1",
      createdAt: 1000,
      updatedAt: 2000,
    });
  });
});
