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
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  Transaction,
  TransactionDraft,
} from "../features/transactions/model";
import { transactionConverter } from "./converters";
import { assertOnline, normalizeDataError } from "./errors";

export interface TransactionSnapshot {
  transactions: readonly Transaction[];
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface FirestoreTransactionRepository {
  subscribe(
    onData: (snapshot: TransactionSnapshot) => void,
    onError: (error: ReturnType<typeof normalizeDataError>) => void,
  ): Unsubscribe;
  create(
    draft: TransactionDraft,
    categoryLabelSnapshot: string,
  ): Promise<string>;
  update(
    id: string,
    draft: TransactionDraft,
    categoryLabelSnapshot: string,
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

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
  };
}
