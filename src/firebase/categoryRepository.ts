import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { CategoryRepository } from "../features/categories/repository";
import type { TransactionType } from "../features/transactions/model";
import { customCategoryConverter } from "./converters";
import { assertOnline, normalizeDataError } from "./errors";

export function createFirestoreCategoryRepository(
  firestore: Firestore,
  householdId: string,
  userId: string,
): CategoryRepository {
  const categoriesCollection = collection(
    firestore,
    "households",
    householdId,
    "categories",
  );

  return {
    subscribe(onData, onError) {
      return onSnapshot(
        categoriesCollection.withConverter(customCategoryConverter),
        { includeMetadataChanges: true },
        (snapshot) => {
          onData({
            categories: snapshot.docs.map((document) => document.data()),
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
          });
        },
        (error) => onError(normalizeDataError(error)),
      );
    },

    async create(name: string, type: TransactionType, sortOrder: number) {
      assertOnline();
      const reference = doc(categoriesCollection);
      try {
        await setDoc(reference, {
          name,
          type,
          sortOrder,
          archived: false,
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return reference.id;
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },

    async rename(id, name) {
      assertOnline();
      try {
        await updateDoc(doc(categoriesCollection, id), {
          name,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },

    async setArchived(id, archived) {
      assertOnline();
      try {
        await updateDoc(doc(categoriesCollection, id), {
          archived,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },
  };
}
