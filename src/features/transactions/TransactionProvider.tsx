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
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { useCategories } from "../categories/CategoryProvider";
import type { Transaction, TransactionDraft } from "./model";
import type { TransactionRepository } from "./repository";

interface TransactionContextValue {
  transactions: readonly Transaction[];
  status: "idle" | "loading" | "ready" | "offline" | "error";
  error: DataOperationError | null;
  hasPendingWrites: boolean;
  createTransaction: (draft: TransactionDraft) => Promise<string>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  retry: () => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({
  repository,
  waiting = false,
  observeOnline = true,
  children,
}: {
  repository: TransactionRepository | null;
  waiting?: boolean;
  observeOnline?: boolean;
  children: ReactNode;
}) {
  const { categoryFor, labelFor } = useCategories();
  const isOnline = useOnlineStatus();
  const [transactions, setTransactions] = useState<readonly Transaction[]>([]);
  const [status, setStatus] =
    useState<TransactionContextValue["status"]>("loading");
  const [error, setError] = useState<DataOperationError | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    if (!repository) {
      return;
    }

    return repository.subscribe(
      (snapshot) => {
        setTransactions(snapshot.transactions);
        setHasPendingWrites(snapshot.hasPendingWrites);
        setStatus(
          observeOnline && snapshot.fromCache && !isOnline
            ? "offline"
            : "ready",
        );
      },
      (subscriptionError) => {
        const error =
          subscriptionError instanceof DataOperationError
            ? subscriptionError
            : new DataOperationError(
                "unknown",
                "The transaction repository failed.",
                subscriptionError,
              );
        setError(error);
        setStatus(error.kind === "offline" ? "offline" : "error");
      },
    );
  }, [isOnline, observeOnline, repository, retryToken]);

  const requireRepository = useCallback((): TransactionRepository => {
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
      const category = categoryFor(draft.categoryId);
      return category ? labelFor(category) : draft.categoryId;
    },
    [categoryFor, labelFor],
  );

  const effectiveStatus = !repository
    ? waiting
      ? "loading"
      : "idle"
    : observeOnline && !isOnline && status === "ready"
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
      deleteAllTransactions: async () => {
        await requireRepository().removeAll(
          transactions.map((transaction) => transaction.id),
        );
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
