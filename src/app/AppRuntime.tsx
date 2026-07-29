import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { DataOperationError } from "../firebase/errors";
import { useAuth } from "../features/auth/AuthProvider";
import type { DemoTransactionRepository } from "../features/demo/DemoTransactionRepository";
import { useHousehold } from "../features/household/HouseholdProvider";
import type { Locale } from "../i18n";

export type ApplicationMode = "production" | "demo";

interface AppRuntimeContextValue {
  mode: ApplicationMode;
  basePath: "/app" | "/demo";
  userLabel: string;
  status: "loading" | "ready" | "error";
  error: DataOperationError | null;
  preferenceError: DataOperationError | null;
  saveLocale: (locale: Locale) => Promise<void>;
  exit: () => Promise<void>;
  retry: () => void;
  resetDemo: (() => void) | null;
}

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function ProductionRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, signOutUser } = useAuth();
  const household = useHousehold();
  const value = useMemo<AppRuntimeContextValue>(
    () => ({
      mode: "production",
      basePath: "/app",
      userLabel: user?.displayName ?? user?.email ?? "Ludcount",
      status: household.status === "idle" ? "loading" : household.status,
      error: household.error,
      preferenceError: household.preferenceError,
      saveLocale: household.saveLocale,
      exit: signOutUser,
      retry: household.retry,
      resetDemo: null,
    }),
    [household, signOutUser, user],
  );

  return (
    <AppRuntimeContext.Provider value={value}>
      {children}
    </AppRuntimeContext.Provider>
  );
}

export function DemoRuntimeProvider({
  repository,
  userLabel,
  children,
}: {
  repository: DemoTransactionRepository;
  userLabel: string;
  children: ReactNode;
}) {
  const value = useMemo<AppRuntimeContextValue>(
    () => ({
      mode: "demo",
      basePath: "/demo",
      userLabel,
      status: "ready",
      error: null,
      preferenceError: null,
      saveLocale: async () => undefined,
      exit: async () => undefined,
      retry: () => undefined,
      resetDemo: () => repository.reset(),
    }),
    [repository, userLabel],
  );

  return (
    <AppRuntimeContext.Provider value={value}>
      {children}
    </AppRuntimeContext.Provider>
  );
}

export function useAppRuntime(): AppRuntimeContextValue {
  const context = useContext(AppRuntimeContext);
  if (!context) {
    throw new Error(
      "useAppRuntime must be used within an app runtime provider.",
    );
  }
  return context;
}
