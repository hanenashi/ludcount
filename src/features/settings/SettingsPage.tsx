import { LogOut, RotateCcw, Tags } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppRuntime } from "../../app/AppRuntime";
import { useI18n, type Locale } from "../../i18n";
import { DataImportSection } from "../import/DataImportSection";
import { DataManagementSection } from "./DataManagementSection";
import {
  defaultDisplayCurrency,
  displayCurrencySymbol,
  type DisplayCurrencyPreference,
} from "../../lib/money";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const runtime = useAppRuntime();
  const automaticCurrencySymbol = displayCurrencySymbol(
    defaultDisplayCurrency(locale),
  );
  const [savingLocale, setSavingLocale] = useState<Locale | null>(null);
  const [savingCurrency, setSavingCurrency] =
    useState<DisplayCurrencyPreference | null>(null);
  const [preferenceFailure, setPreferenceFailure] = useState<
    "locale" | "currency" | null
  >(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [demoReset, setDemoReset] = useState(false);
  const navigate = useNavigate();

  const changeLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale || savingLocale) {
      return;
    }
    setSavingLocale(nextLocale);
    setPreferenceFailure(null);
    try {
      await runtime.saveLocale(nextLocale);
      setLocale(nextLocale);
    } catch {
      setPreferenceFailure("locale");
    } finally {
      setSavingLocale(null);
    }
  };

  const changeCurrency = async (next: DisplayCurrencyPreference) => {
    if (next === runtime.currencyPreference || savingCurrency) return;
    setSavingCurrency(next);
    setPreferenceFailure(null);
    try {
      await runtime.saveCurrencyPreference(next);
    } catch {
      setPreferenceFailure("currency");
    } finally {
      setSavingCurrency(null);
    }
  };

  return (
    <div className="page settings-page">
      <h1>{t("settings.heading")}</h1>

      <section className="settings-section">
        <div>
          <h2>{t("settings.language")}</h2>
          <p>{t("settings.languageDescription")}</p>
        </div>
        <div
          className="language-options"
          role="group"
          aria-label={t("settings.language")}
        >
          <button
            className={
              locale === "cs"
                ? "language-button language-button-active"
                : "language-button"
            }
            type="button"
            aria-pressed={locale === "cs"}
            disabled={savingLocale !== null}
            onClick={() => void changeLocale("cs")}
          >
            {t("settings.czech")}
          </button>
          <button
            className={
              locale === "en"
                ? "language-button language-button-active"
                : "language-button"
            }
            type="button"
            aria-pressed={locale === "en"}
            disabled={savingLocale !== null}
            onClick={() => void changeLocale("en")}
          >
            {t("settings.english")}
          </button>
          <button
            className={
              locale === "ja"
                ? "language-button language-button-active"
                : "language-button"
            }
            type="button"
            aria-pressed={locale === "ja"}
            disabled={savingLocale !== null}
            onClick={() => void changeLocale("ja")}
          >
            {t("settings.japanese")}
          </button>
        </div>
        {preferenceFailure === "locale" ? (
          <p className="settings-inline-error" role="alert">
            {t("settings.languageSaveError")}
          </p>
        ) : null}
        {savingLocale ? (
          <p className="sr-only" role="status" aria-live="polite">
            {t("settings.savingLanguage")}
          </p>
        ) : null}
      </section>

      <section className="settings-section">
        <div>
          <h2>{t("settings.currency")}</h2>
          <p>{t("settings.currencyDescription")}</p>
        </div>
        <div
          className="language-options currency-options"
          role="group"
          aria-label={t("settings.currency")}
        >
          {(
            [
              [
                "auto",
                `${t("settings.currencyAuto")} (${automaticCurrencySymbol})`,
              ],
              ["CZK", t("settings.currencyCzk")],
              ["USD", t("settings.currencyUsd")],
              ["JPY", t("settings.currencyJpy")],
            ] as const
          ).map(([value, label]) => (
            <button
              className={
                runtime.currencyPreference === value
                  ? "language-button language-button-active"
                  : "language-button"
              }
              type="button"
              key={value}
              aria-pressed={runtime.currencyPreference === value}
              disabled={savingCurrency !== null}
              onClick={() => void changeCurrency(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {preferenceFailure === "currency" ? (
          <p className="settings-inline-error" role="alert">
            {t("settings.currencySaveError")}
          </p>
        ) : null}
        {savingCurrency ? (
          <p className="sr-only" role="status" aria-live="polite">
            {t("settings.savingCurrency")}
          </p>
        ) : null}
      </section>

      <DataManagementSection />

      <DataImportSection />

      <section className="settings-section">
        <div>
          <h2>{t("settings.categories")}</h2>
          <p>{t("settings.categoriesDescription")}</p>
        </div>
        <Link
          className="button button-secondary"
          to={`${runtime.basePath}/settings/categories`}
        >
          <Tags size={18} aria-hidden="true" />
          {t("settings.manageCategories")}
        </Link>
      </section>

      {runtime.mode === "demo" ? (
        <section className="settings-section">
          <div>
            <h2>{t("settings.dataHeading")}</h2>
            <p>{t("demo.settingsDescription")}</p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              runtime.resetDemo?.();
              setDemoReset(true);
            }}
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t("demo.reset")}
          </button>
          {demoReset ? (
            <p
              className="settings-inline-success"
              role="status"
              aria-live="polite"
            >
              {t("demo.resetComplete")}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="settings-section">
        <div>
          <h2>{t("settings.account")}</h2>
          <p>
            {runtime.mode === "demo"
              ? t("demo.identityDescription")
              : t("settings.signedInAs")}
            : <strong>{runtime.userLabel}</strong>
          </p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            setSignOutError(false);
            void runtime
              .exit()
              .then(() => navigate("/sign-in"))
              .catch(() => setSignOutError(true))
              .finally(() => setSigningOut(false));
          }}
        >
          <LogOut size={18} aria-hidden="true" />
          {signingOut
            ? t("common.working")
            : runtime.mode === "demo"
              ? t("demo.exit")
              : t("nav.signOut")}
        </button>
        {signOutError ? (
          <p className="settings-inline-error" role="alert">
            {t("settings.signOutError")}
          </p>
        ) : null}
      </section>

      <p className="version-copy">
        {t("settings.version")} {__APP_VERSION__}
      </p>
    </div>
  );
}
