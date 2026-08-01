import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { TransactionRepository } from "../features/transactions/repository";
import { transactionConverter } from "./converters";
import { assertOnline, normalizeDataError } from "./errors";

export type FirestoreTransactionRepository = TransactionRepository;

const BULK_DELETE_SIZE = 400;

export function createFirestoreTransactionRepository(
  firestore: Firestore,
  householdId: string,
  userId: string,
): FirestoreTransactionRepository {
  const transactionsCollection = collection(
    firestore,
    "households",
    householdId,
    "transactions",
  );

  return {
    subscribe(onData, onError) {
      const transactionsQuery = query(
        transactionsCollection.withConverter(transactionConverter),
        orderBy("dateKey", "desc"),
        orderBy("createdAt", "desc"),
      );

      return onSnapshot(
        transactionsQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          onData({
            transactions: snapshot.docs.map((document) => document.data()),
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
          });
        },
        (error) => onError(normalizeDataError(error)),
      );
    },

    async create(draft, categoryLabelSnapshot) {
      assertOnline();
      const reference = doc(transactionsCollection);
      try {
        await setDoc(reference, {
          ...draft,
          currency: "CZK",
          categoryLabelSnapshot,
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return reference.id;
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },

    async update(id, draft, categoryLabelSnapshot) {
      assertOnline();
      try {
        await updateDoc(doc(transactionsCollection, id), {
          ...draft,
          currency: "CZK",
          categoryLabelSnapshot,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },

    async remove(id) {
      assertOnline();
      try {
        await deleteDoc(doc(transactionsCollection, id));
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },

    async removeAll(ids) {
      assertOnline();
      try {
        for (let index = 0; index < ids.length; index += BULK_DELETE_SIZE) {
          const batch = writeBatch(firestore);
          for (const id of ids.slice(index, index + BULK_DELETE_SIZE)) {
            batch.delete(doc(transactionsCollection, id));
          }
          await batch.commit();
        }
      } catch (error) {
        throw normalizeDataError(error, "write-failure");
      }
    },
  };
}
