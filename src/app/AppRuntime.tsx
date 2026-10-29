import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DataOperationError } from "../firebase/errors";
import { createFirestoreImportRepository } from "../firebase/importRepository";
import { useAuth } from "../features/auth/AuthProvider";
import { useHousehold } from "../features/household/HouseholdProvider";
import type { DataImportRepository } from "../features/import/repository";
import { useI18n, type Locale } from "../i18n";
import { getFirebaseServices } from "../lib/firebase";
import {
  displayCurrencySymbol,
  resolveDisplayCurrency,
  type AmountDisplayMode,
  type DisplayCurrency,
  type DisplayCurrencyPreference,
} from "../lib/money";
import type { TextSizePreference } from "../lib/textSize";

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
  amountDisplay: AmountDisplayMode;
  importRepository: DataImportRepository | null;
  canManageHouseholdData: boolean;
  showBuiltInCategories: boolean;
  textSize: TextSizePreference;
  saveLocale: (locale: Locale) => Promise<void>;
  saveCurrencyPreference: (
    preference: DisplayCurrencyPreference,
  ) => Promise<void>;
  saveAmountDisplay: (amountDisplay: AmountDisplayMode) => Promise<void>;
  saveShowBuiltInCategories: (show: boolean) => Promise<void>;
  saveTextSize: (textSize: TextSizePreference) => Promise<void>;
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
  const importRepository = useMemo(
    () =>
      user &&
      household.workspace?.household.ownerId === user.uid &&
      household.workspace.household.id
        ? createFirestoreImportRepository(
            getFirebaseServices().firestore,
            household.workspace.household.id,
            user.uid,
          )
        : null,
    [household.workspace, user],
  );
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
      amountDisplay: household.workspace?.profile.amountDisplay ?? "exact",
      importRepository,
      canManageHouseholdData: importRepository !== null,
      showBuiltInCategories:
        household.workspace?.household.showBuiltInCategories ?? true,
      textSize: household.workspace?.profile.textSize ?? "standard",
      saveLocale: household.saveLocale,
      saveCurrencyPreference: household.saveDisplayCurrency,
      saveAmountDisplay: household.saveAmountDisplay,
      saveShowBuiltInCategories: household.saveShowBuiltInCategories,
      saveTextSize: household.saveTextSize,
      exit: signOutUser,
      retry: household.retry,
      resetDemo: null,
    }),
    [
      currencyPreference,
      displayCurrency,
      household,
      importRepository,
      signOutUser,
      user,
    ],
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
  const [textSize, setTextSize] = useState<TextSizePreference>("standard");
  const [amountDisplay, setAmountDisplay] =
    useState<AmountDisplayMode>("exact");
  const displayCurrency = resolveDisplayCurrency(locale, currencyPreference);
  const resetDemo = useCallback(() => {
    setCurrencyPreference("auto");
    setTextSize("standard");
    setAmountDisplay("exact");
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
      amountDisplay,
      importRepository: null,
      canManageHouseholdData: false,
      showBuiltInCategories: true,
      textSize,
      saveLocale: async () => undefined,
      saveCurrencyPreference: async (preference) => {
        setCurrencyPreference(preference);
      },
      saveAmountDisplay: async (nextAmountDisplay) => {
        setAmountDisplay(nextAmountDisplay);
      },
      saveShowBuiltInCategories: async () => undefined,
      saveTextSize: async (nextTextSize) => {
        setTextSize(nextTextSize);
      },
      exit: async () => undefined,
      retry: () => undefined,
      resetDemo,
    }),
    [
      amountDisplay,
      currencyPreference,
      displayCurrency,
      resetDemo,
      textSize,
      userLabel,
    ],
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
