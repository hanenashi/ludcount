import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createFirestoreHouseholdRepository,
  type HouseholdRepository,
} from "../../firebase/householdRepository";
import type { DataOperationError } from "../../firebase/errors";
import type { UserWorkspace } from "../../firebase/model";
import { useI18n, type Locale } from "../../i18n";
import { getFirebaseServices } from "../../lib/firebase";
import type { DisplayCurrencyPreference } from "../../lib/money";
import { useAuth } from "../auth/AuthProvider";

type HouseholdStatus = "idle" | "loading" | "ready" | "error";

interface HouseholdContextValue {
  workspace: UserWorkspace | null;
  status: HouseholdStatus;
  error: DataOperationError | null;
  preferenceError: DataOperationError | null;
  saveLocale: (locale: Locale) => Promise<void>;
  saveDisplayCurrency: (preference: DisplayCurrencyPreference) => Promise<void>;
  retry: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [workspace, setWorkspace] = useState<UserWorkspace | null>(null);
  const [status, setStatus] = useState<HouseholdStatus>("loading");
  const [error, setError] = useState<DataOperationError | null>(null);
  const [preferenceError, setPreferenceError] =
    useState<DataOperationError | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const initialLocale = useRef(locale);
  const initialHouseholdName = useRef(t("household.defaultName"));

  const repository = useMemo<HouseholdRepository>(
    () => createFirestoreHouseholdRepository(getFirebaseServices().firestore),
    [],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    void repository
      .ensurePersonalWorkspace(
        user,
        initialLocale.current,
        initialHouseholdName.current,
      )
      .then((nextWorkspace) => {
        if (!active) {
          return;
        }
        setWorkspace(nextWorkspace);
        setLocale(nextWorkspace.profile.locale);
        setStatus("ready");
      })
      .catch((loadError: DataOperationError) => {
        if (!active) {
          return;
        }
        setWorkspace(null);
        setError(loadError);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [repository, retryToken, setLocale, user]);

  const saveLocale = useCallback(
    async (nextLocale: Locale) => {
      if (!user || !workspace) {
        return;
      }
      setPreferenceError(null);
      try {
        await repository.updateLocale(user.uid, nextLocale);
        setWorkspace((current) =>
          current
            ? {
                ...current,
                profile: {
                  ...current.profile,
                  locale: nextLocale,
                  updatedAt: Date.now(),
                },
              }
            : current,
        );
      } catch (saveError) {
        setPreferenceError(saveError as DataOperationError);
        throw saveError;
      }
    },
    [repository, user, workspace],
  );

  const saveDisplayCurrency = useCallback(
    async (displayCurrency: DisplayCurrencyPreference) => {
      if (!user || !workspace) return;
      setPreferenceError(null);
      try {
        await repository.updateDisplayCurrency(user.uid, displayCurrency);
        setWorkspace((current) =>
          current
            ? {
                ...current,
                profile: {
                  ...current.profile,
                  displayCurrency,
                  updatedAt: Date.now(),
                },
              }
            : current,
        );
      } catch (saveError) {
        setPreferenceError(saveError as DataOperationError);
        throw saveError;
      }
    },
    [repository, user, workspace],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      workspace: user ? workspace : null,
      status: user ? status : "idle",
      error: user ? error : null,
      preferenceError: user ? preferenceError : null,
      saveLocale,
      saveDisplayCurrency,
      retry: () => {
        setStatus("loading");
        setError(null);
        setRetryToken((current) => current + 1);
      },
    }),
    [
      error,
      preferenceError,
      saveDisplayCurrency,
      saveLocale,
      status,
      user,
      workspace,
    ],
  );

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used within HouseholdProvider.");
  }
  return context;
}
