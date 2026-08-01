import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DataOperationError } from "../firebase/errors";
import { useAuth } from "../features/auth/AuthProvider";
import { useHousehold } from "../features/household/HouseholdProvider";
import { useI18n, type Locale } from "../i18n";
import {
  displayCurrencySymbol,
  resolveDisplayCurrency,
  type DisplayCurrency,
  type DisplayCurrencyPreference,
} from "../lib/money";

export type ApplicationMode = "production" | "demo";

interface AppRuntimeContextValue {
  mode: ApplicationMode;
  basePath: "/app" | "/demo";
  userLabel: string;
  status: "loading" | "ready" | "error";
  error: DataOperationError | null;
  preferenceError: DataOperationError | null;
  currencyPreference: DisplayCurrencyPreference;
  displayCurrency: DisplayCurrency;
  currencySymbol: string;
  saveLocale: (locale: Locale) => Promise<void>;
  saveCurrencyPreference: (
    preference: DisplayCurrencyPreference,
  ) => Promise<void>;
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
  const { locale } = useI18n();
  const currencyPreference =
    household.workspace?.profile.displayCurrency ?? "auto";
  const displayCurrency = resolveDisplayCurrency(locale, currencyPreference);
  const value = useMemo<AppRuntimeContextValue>(
    () => ({
      mode: "production",
      basePath: "/app",
      userLabel: user?.displayName ?? user?.email ?? "Ludcount",
      status: household.status === "idle" ? "loading" : household.status,
      error: household.error,
      preferenceError: household.preferenceError,
      currencyPreference,
      displayCurrency,
      currencySymbol: displayCurrencySymbol(displayCurrency),
      saveLocale: household.saveLocale,
      saveCurrencyPreference: household.saveDisplayCurrency,
      exit: signOutUser,
      retry: household.retry,
      resetDemo: null,
    }),
    [currencyPreference, displayCurrency, household, signOutUser, user],
  );

  return (
    <AppRuntimeContext.Provider value={value}>
      {children}
    </AppRuntimeContext.Provider>
  );
}

export function DemoRuntimeProvider({
  onReset,
  userLabel,
  children,
}: {
  onReset: () => void;
  userLabel: string;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const [currencyPreference, setCurrencyPreference] =
    useState<DisplayCurrencyPreference>("auto");
  const displayCurrency = resolveDisplayCurrency(locale, currencyPreference);
  const resetDemo = useCallback(() => {
    setCurrencyPreference("auto");
    onReset();
  }, [onReset]);
  const value = useMemo<AppRuntimeContextValue>(
    () => ({
      mode: "demo",
      basePath: "/demo",
      userLabel,
      status: "ready",
      error: null,
      preferenceError: null,
      currencyPreference,
      displayCurrency,
      currencySymbol: displayCurrencySymbol(displayCurrency),
      saveLocale: async () => undefined,
      saveCurrencyPreference: async (preference) => {
        setCurrencyPreference(preference);
      },
      exit: async () => undefined,
      retry: () => undefined,
      resetDemo,
    }),
    [currencyPreference, displayCurrency, resetDemo, userLabel],
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
