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
import { useI18n } from "../../i18n";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import {
  builtInCategories,
  type Category,
  type CustomCategory,
  type TransactionType,
} from "../transactions/model";
import type { CategoryRepository } from "./repository";

interface CategoryContextValue {
  categories: readonly Category[];
  customCategories: readonly CustomCategory[];
  status: "idle" | "loading" | "ready" | "offline" | "error";
  error: DataOperationError | null;
  canManage: boolean;
  labelFor: (category: Category) => string;
  categoryFor: (categoryId: string) => Category | undefined;
  createCategory: (name: string, type: TransactionType) => Promise<string>;
  renameCategory: (id: string, name: string) => Promise<void>;
  setCategoryArchived: (id: string, archived: boolean) => Promise<void>;
  retry: () => void;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

function normalizeSubscriptionError(error: Error): DataOperationError {
  return error instanceof DataOperationError
    ? error
    : new DataOperationError(
        "unknown",
        "The category repository failed.",
        error,
      );
}

export function CategoryProvider({
  repository,
  waiting = false,
  observeOnline = true,
  canManage,
  children,
}: {
  repository: CategoryRepository | null;
  waiting?: boolean;
  observeOnline?: boolean;
  canManage: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const [customCategories, setCustomCategories] = useState<
    readonly CustomCategory[]
  >([]);
  const [status, setStatus] =
    useState<CategoryContextValue["status"]>("loading");
  const [error, setError] = useState<DataOperationError | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!repository) return;
    return repository.subscribe(
      (snapshot) => {
        setCustomCategories(snapshot.categories);
        setError(null);
        setStatus(
          observeOnline && snapshot.fromCache && !isOnline
            ? "offline"
            : "ready",
        );
      },
      (subscriptionError) => {
        const nextError = normalizeSubscriptionError(subscriptionError);
        setError(nextError);
        setStatus(nextError.kind === "offline" ? "offline" : "error");
      },
    );
  }, [isOnline, observeOnline, repository, retryToken]);

  const categories = useMemo(
    () =>
      [...builtInCategories, ...customCategories].sort(
        (left, right) =>
          left.type.localeCompare(right.type) ||
          left.sortOrder - right.sortOrder ||
          left.id.localeCompare(right.id),
      ),
    [customCategories],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const requireManagement = useCallback(() => {
    if (!repository || !canManage) {
      throw new DataOperationError(
        "permission-denied",
        "Category management is not available.",
      );
    }
    return repository;
  }, [canManage, repository]);

  const effectiveStatus = !repository
    ? waiting
      ? "loading"
      : "idle"
    : observeOnline && !isOnline && status === "ready"
      ? "offline"
      : status;

  const value = useMemo<CategoryContextValue>(
    () => ({
      categories,
      customCategories,
      status: effectiveStatus,
      error: repository ? error : null,
      canManage,
      labelFor: (category) =>
        category.source === "built-in" ? t(category.labelKey) : category.name,
      categoryFor: (categoryId) => categoriesById.get(categoryId),
      createCategory: async (name, type) => {
        const nextSortOrder =
          Math.max(
            999,
            ...customCategories
              .filter((category) => category.type === type)
              .map((category) => category.sortOrder),
          ) + 1;
        return requireManagement().create(name.trim(), type, nextSortOrder);
      },
      renameCategory: async (id, name) => {
        await requireManagement().rename(id, name.trim());
      },
      setCategoryArchived: async (id, archived) => {
        await requireManagement().setArchived(id, archived);
      },
      retry: () => {
        setStatus("loading");
        setError(null);
        setRetryToken((current) => current + 1);
      },
    }),
    [
      canManage,
      categories,
      categoriesById,
      customCategories,
      effectiveStatus,
      error,
      repository,
      requireManagement,
      t,
    ],
  );

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories(): CategoryContextValue {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategories must be used within CategoryProvider.");
  }
  return context;
}
