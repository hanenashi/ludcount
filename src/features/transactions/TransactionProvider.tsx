import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DataOperationError } from "../../firebase/errors";
import {
  createFirestoreTransactionRepository,
  type FirestoreTransactionRepository,
} from "../../firebase/transactionRepository";
import { useI18n } from "../../i18n";
import { getFirebaseServices } from "../../lib/firebase";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { useAuth } from "../auth/AuthProvider";
import { useHousehold } from "../household/HouseholdProvider";
import { categories, type Transaction, type TransactionDraft } from "./model";

const categoriesById = new Map(
  categories.map((category) => [category.id, category]),
);

interface TransactionContextValue {
  transactions: readonly Transaction[];
  status: "idle" | "loading" | "ready" | "offline" | "error";
  error: DataOperationError | null;
  hasPendingWrites: boolean;
  createTransaction: (draft: TransactionDraft) => Promise<string>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  retry: () => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { workspace, status: householdStatus } = useHousehold();
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const [transactions, setTransactions] = useState<readonly Transaction[]>([]);
  const [status, setStatus] =
    useState<TransactionContextValue["status"]>("loading");
  const [error, setError] = useState<DataOperationError | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const userId = user?.uid;
  const householdId = workspace?.household.id;

  const repository = useMemo<FirestoreTransactionRepository | null>(
    () =>
      userId && householdId
        ? createFirestoreTransactionRepository(
            getFirebaseServices().firestore,
            householdId,
            userId,
          )
        : null,
    [householdId, userId],
  );

  useEffect(() => {
    if (!repository || householdStatus !== "ready") {
      return;
    }

    return repository.subscribe(
      (snapshot) => {
        setTransactions(snapshot.transactions);
        setHasPendingWrites(snapshot.hasPendingWrites);
        setStatus(snapshot.fromCache && !isOnline ? "offline" : "ready");
      },
      (subscriptionError) => {
        setError(subscriptionError);
        setStatus(subscriptionError.kind === "offline" ? "offline" : "error");
      },
    );
  }, [householdStatus, isOnline, repository, retryToken]);

  const requireRepository = useCallback((): FirestoreTransactionRepository => {
    if (!repository) {
      throw new DataOperationError(
        "write-failure",
        "The transaction repository is not ready.",
      );
    }
    return repository;
  }, [repository]);

  const categorySnapshot = useCallback(
    (draft: TransactionDraft): string => {
      const category = categoriesById.get(draft.categoryId);
      return category ? t(category.labelKey) : draft.categoryId;
    },
    [t],
  );

  const effectiveStatus =
    !repository || householdStatus !== "ready"
      ? householdStatus === "loading"
        ? "loading"
        : "idle"
      : !isOnline && status === "ready"
        ? "offline"
        : status;

  const value = useMemo<TransactionContextValue>(
    () => ({
      transactions: repository ? transactions : [],
      status: effectiveStatus,
      error: repository ? error : null,
      hasPendingWrites,
      createTransaction: async (draft) => {
        return requireRepository().create(draft, categorySnapshot(draft));
      },
      updateTransaction: async (id, draft) => {
        await requireRepository().update(id, draft, categorySnapshot(draft));
      },
      deleteTransaction: async (id) => {
        await requireRepository().remove(id);
      },
      retry: () => {
        setStatus("loading");
        setError(null);
        setRetryToken((current) => current + 1);
      },
    }),
    [
      categorySnapshot,
      effectiveStatus,
      error,
      hasPendingWrites,
      repository,
      requireRepository,
      transactions,
    ],
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions(): TransactionContextValue {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within TransactionProvider.");
  }
  return context;
}
