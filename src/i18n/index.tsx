import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cs } from "./cs";
import { en, type TranslationKey, type Translations } from "./en";
import { ja } from "./ja";

export type Locale = "cs" | "en" | "ja";

const LOCALE_STORAGE_KEY = "ludcount.locale";
const dictionaries: Record<Locale, Translations> = { cs, en, ja };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en" || stored === "cs" || stored === "ja" ? stored : "cs";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => dictionaries[locale][key],
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
