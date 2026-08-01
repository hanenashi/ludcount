import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type FieldValue,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import { isValidDateKey } from "../lib/dates";
import { asMoneyAmount, MAX_AMOUNT_MINOR } from "../lib/money";
import type {
  CustomCategory,
  Transaction,
  TransactionType,
} from "../features/transactions/model";
import { DataOperationError } from "./errors";
import type { Household, HouseholdMember, UserProfile } from "./model";

function invalidData(path: string, detail: string): never {
  throw new DataOperationError(
    "invalid-data",
    `Invalid Firestore data at ${path}: ${detail}`,
  );
}

function readString(
  data: DocumentData,
  field: string,
  path: string,
  allowEmpty = false,
): string {
  const value = data[field];
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    invalidData(path, `${field} must be a string.`);
  }
  return value;
}

function readTimestamp(
  data: DocumentData,
  field: string,
  path: string,
): number {
  const value = data[field];
  if (!(value instanceof Timestamp)) {
    invalidData(path, `${field} must be a Firestore timestamp.`);
  }
  return value.toMillis();
}

function readBoolean(data: DocumentData, field: string, path: string): boolean {
  const value = data[field];
  if (typeof value !== "boolean") {
    invalidData(path, `${field} must be a boolean.`);
  }
  return value;
}

function readInteger(data: DocumentData, field: string, path: string): number {
  const value = data[field];
  if (!Number.isInteger(value)) {
    invalidData(path, `${field} must be an integer.`);
  }
  return value;
}

function writeTimestamp(
  value: number | FieldValue | undefined,
  field: string,
): Timestamp {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DataOperationError(
      "invalid-data",
      `${field} must be a numeric millisecond timestamp.`,
    );
  }
  return Timestamp.fromMillis(value);
}

function readLocale(data: DocumentData, path: string): "cs" | "en" | "ja" {
  const locale = readString(data, "locale", path);
  if (locale !== "cs" && locale !== "en" && locale !== "ja") {
    invalidData(path, "locale must be cs, en, or ja.");
  }
  return locale;
}

function readTransactionType(
  data: DocumentData,
  path: string,
): TransactionType {
  const type = readString(data, "type", path);
  if (type !== "income" && type !== "expense") {
    invalidData(path, "type must be income or expense.");
  }
  return type;
}

function snapshotData(
  snapshot: QueryDocumentSnapshot,
  options?: SnapshotOptions,
): { data: DocumentData; path: string } {
  return {
    data: snapshot.data({
      ...(options ?? {}),
      serverTimestamps: "estimate",
    }),
    path: snapshot.ref.path,
  };
}

export const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(profile) {
    return {
      displayName: profile.displayName,
      email: profile.email,
      locale: profile.locale,
      activeHouseholdId: profile.activeHouseholdId,
      createdAt: writeTimestamp(profile.createdAt, "createdAt"),
      updatedAt: writeTimestamp(profile.updatedAt, "updatedAt"),
    };
  },
  fromFirestore(snapshot, options) {
    const { data, path } = snapshotData(snapshot, options);
    return {
      id: snapshot.id,
      displayName: readString(data, "displayName", path, true),
      email: readString(data, "email", path, true),
      locale: readLocale(data, path),
      activeHouseholdId: readString(data, "activeHouseholdId", path),
      createdAt: readTimestamp(data, "createdAt", path),
      updatedAt: readTimestamp(data, "updatedAt", path),
    };
  },
};

export const householdConverter: FirestoreDataConverter<Household> = {
  toFirestore(household) {
    return {
      name: household.name,
      currency: household.currency,
      ownerId: household.ownerId,
      createdAt: writeTimestamp(household.createdAt, "createdAt"),
      updatedAt: writeTimestamp(household.updatedAt, "updatedAt"),
    };
  },
  fromFirestore(snapshot, options) {
    const { data, path } = snapshotData(snapshot, options);
    const currency = readString(data, "currency", path);
    if (currency !== "CZK") {
      invalidData(path, "currency must be CZK in Phase 2.");
    }
    return {
      id: snapshot.id,
      name: readString(data, "name", path),
      currency,
      ownerId: readString(data, "ownerId", path),
      createdAt: readTimestamp(data, "createdAt", path),
      updatedAt: readTimestamp(data, "updatedAt", path),
    };
  },
};

export const householdMemberConverter: FirestoreDataConverter<HouseholdMember> =
  {
    toFirestore(member) {
      return {
        role: member.role,
        displayName: member.displayName,
        joinedAt: writeTimestamp(member.joinedAt, "joinedAt"),
      };
    },
    fromFirestore(snapshot, options) {
      const { data, path } = snapshotData(snapshot, options);
      const role = readString(data, "role", path);
      if (role !== "owner" && role !== "member") {
        invalidData(path, "role must be owner or member.");
      }
      return {
        id: snapshot.id,
        role,
        displayName: readString(data, "displayName", path, true),
        joinedAt: readTimestamp(data, "joinedAt", path),
      };
    },
  };

export const customCategoryConverter: FirestoreDataConverter<CustomCategory> = {
  toFirestore(category) {
    return {
      name: category.name,
      type: category.type,
      sortOrder: category.sortOrder,
      archived: category.archived,
      createdBy: category.createdBy,
      createdAt: writeTimestamp(category.createdAt, "createdAt"),
      updatedAt: writeTimestamp(category.updatedAt, "updatedAt"),
    };
  },
  fromFirestore(snapshot, options) {
    const { data, path } = snapshotData(snapshot, options);
    const name = readString(data, "name", path);
    if (name.length > 60)
      invalidData(path, "name must be at most 60 characters.");
    const sortOrder = readInteger(data, "sortOrder", path);
    if (sortOrder < 0 || sortOrder > 100000) {
      invalidData(path, "sortOrder is out of range.");
    }
    return {
      id: snapshot.id,
      name,
      type: readTransactionType(data, path),
      sortOrder,
      archived: readBoolean(data, "archived", path),
      source: "custom",
      createdBy: readString(data, "createdBy", path),
      createdAt: readTimestamp(data, "createdAt", path),
      updatedAt: readTimestamp(data, "updatedAt", path),
    };
  },
};

export const transactionConverter: FirestoreDataConverter<Transaction> = {
  toFirestore(transaction) {
    return {
      type: transaction.type,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      categoryId: transaction.categoryId,
      categoryLabelSnapshot: transaction.categoryLabelSnapshot,
      dateKey: transaction.dateKey,
      monthKey: transaction.monthKey,
      note: transaction.note,
      createdBy: transaction.createdBy,
      createdAt: writeTimestamp(transaction.createdAt, "createdAt"),
      updatedAt: writeTimestamp(transaction.updatedAt, "updatedAt"),
    };
  },
  fromFirestore(snapshot, options) {
    const { data, path } = snapshotData(snapshot, options);
    const amountMinor = data.amountMinor;
    if (
      !Number.isInteger(amountMinor) ||
      amountMinor <= 0 ||
      amountMinor > MAX_AMOUNT_MINOR
    ) {
      invalidData(path, "amountMinor must be a positive integer in range.");
    }

    const dateKey = readString(data, "dateKey", path);
    const monthKey = readString(data, "monthKey", path);
    if (!isValidDateKey(dateKey) || monthKey !== dateKey.slice(0, 7)) {
      invalidData(
        path,
        "dateKey and monthKey must describe the same valid date.",
      );
    }

    const currency = readString(data, "currency", path);
    if (currency !== "CZK") {
      invalidData(path, "currency must be CZK in Phase 2.");
    }

    return {
      id: snapshot.id,
      type: readTransactionType(data, path),
      amountMinor: asMoneyAmount(amountMinor),
      currency,
      categoryId: readString(data, "categoryId", path),
      categoryLabelSnapshot: readString(data, "categoryLabelSnapshot", path),
      dateKey,
      monthKey,
      note: readString(data, "note", path, true),
      createdBy: readString(data, "createdBy", path),
      createdAt: readTimestamp(data, "createdAt", path),
      updatedAt: readTimestamp(data, "updatedAt", path),
    };
  },
};
