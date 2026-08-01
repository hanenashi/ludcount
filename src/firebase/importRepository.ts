import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";
import type {
  DataImportRepository,
  ImportProgress,
} from "../features/import/repository";
import { assertOnline, normalizeDataError } from "./errors";

const IMPORT_CHUNK_SIZE = 100;

function chunks<T>(values: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += IMPORT_CHUNK_SIZE) {
    result.push(values.slice(index, index + IMPORT_CHUNK_SIZE));
  }
  return result;
}

async function createMissingDocuments<T>(
  firestore: Firestore,
  values: readonly T[],
  referenceFor: (value: T) => DocumentReference,
  dataFor: (value: T) => Record<string, unknown>,
): Promise<number> {
  let created = 0;
  for (const group of chunks(values)) {
    created += await runTransaction(firestore, async (transaction) => {
      const references = group.map(referenceFor);
      const snapshots = await Promise.all(
        references.map((reference) => transaction.get(reference)),
      );
      let groupCreated = 0;
      snapshots.forEach((snapshot, index) => {
        if (!snapshot.exists()) {
          transaction.set(references[index], dataFor(group[index]));
          groupCreated += 1;
        }
      });
      return groupCreated;
    });
  }
  return created;
}

export function createFirestoreImportRepository(
  firestore: Firestore,
  householdId: string,
  userId: string,
): DataImportRepository {
  const household = doc(firestore, "households", householdId);
  const categories = collection(household, "categories");
  const transactions = collection(household, "transactions");

  return {
    async importCsv(preview, onProgress) {
      assertOnline();
      if (preview.conflictingCategoryIds.length > 0) {
        throw new Error("Import categories conflict with existing categories.");
      }

      const total =
        preview.categoriesToCreate.length + preview.transactionsToCreate.length;
      let completed = 0;
      const report = (increment: number) => {
        completed += increment;
        onProgress({ completed, total } satisfies ImportProgress);
      };

      try {
        const createdCategories = await createMissingDocuments(
          firestore,
          preview.categoriesToCreate,
          (category) => doc(categories, category.id),
          (category) => ({
            name: category.name,
            type: category.type,
            sortOrder: category.sortOrder,
            archived: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        );
        report(preview.categoriesToCreate.length);

        const createdTransactions = await createMissingDocuments(
          firestore,
          preview.transactionsToCreate,
          (item) => doc(transactions, item.id),
          (item) => ({
            type: item.type,
            amountMinor: item.amountMinor,
            currency: "CZK",
            categoryId: item.categoryId,
            categoryLabelSnapshot: item.categoryLabelSnapshot,
            dateKey: item.dateKey,
            monthKey: item.monthKey,
            note: item.note,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        );
        report(preview.transactionsToCreate.length);

        return {
          createdCategories,
          createdTransactions,
          skippedTransactions:
            preview.skippedTransactions +
            (preview.transactionsToCreate.length - createdTransactions),
        };
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },
  };
}
