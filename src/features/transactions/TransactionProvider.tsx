import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Transaction, TransactionDraft } from "./model";
import {
  createMemoryTransactionRepository,
  type TransactionRepository,
} from "./repository";

interface TransactionContextValue {
  transactions: readonly Transaction[];
  createTransaction: (draft: TransactionDraft) => Transaction;
  updateTransaction: (id: string, draft: TransactionDraft) => Transaction;
  deleteTransaction: (id: string) => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const repository = useRef<TransactionRepository>(
    createMemoryTransactionRepository(),
  );
  const [transactions, setTransactions] = useState<readonly Transaction[]>([]);

  const refresh = () => setTransactions(repository.current.list());

  const value = useMemo<TransactionContextValue>(
    () => ({
      transactions,
      createTransaction: (draft) => {
        const created = repository.current.create(draft);
        refresh();
        return created;
      },
      updateTransaction: (id, draft) => {
        const updated = repository.current.update(id, draft);
        refresh();
        return updated;
      },
      deleteTransaction: (id) => {
        repository.current.remove(id);
        refresh();
      },
    }),
    [transactions],
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
