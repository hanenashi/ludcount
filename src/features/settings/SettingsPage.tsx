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
  type AmountDisplayMode,
  type DisplayCurrencyPreference,
} from "../../lib/money";
import type { TextSizePreference } from "../../lib/textSize";

const MINIMUM_SAVE_CUE_MS = 400;

function preferenceButtonClass(active: boolean, saving: boolean) {
  return [
    "language-button",
    active ? "language-button-active" : "",
    saving ? "language-button-saving" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function saveWithMinimumCue(save: () => Promise<void>) {
  const startedAt = Date.now();
  try {
    await save();
  } finally {
    const remaining = MINIMUM_SAVE_CUE_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
  }
}

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const runtime = useAppRuntime();
  const automaticCurrencySymbol = displayCurrencySymbol(
    defaultDisplayCurrency(locale),
  );
  const [savingLocale, setSavingLocale] = useState<Locale | null>(null);
  const [savingCurrency, setSavingCurrency] =
    useState<DisplayCurrencyPreference | null>(null);
  const [savingAmountDisplay, setSavingAmountDisplay] =
    useState<AmountDisplayMode | null>(null);
  const [savingBuiltInCategories, setSavingBuiltInCategories] = useState<
    boolean | null
  >(null);
  const [savingTextSize, setSavingTextSize] =
    useState<TextSizePreference | null>(null);
  const [preferenceFailure, setPreferenceFailure] = useState<
    "locale" | "currency" | "categories" | "textSize" | "amountDisplay" | null
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
      await saveWithMinimumCue(() => runtime.saveLocale(nextLocale));
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
      await saveWithMinimumCue(() => runtime.saveCurrencyPreference(next));
    } catch {
      setPreferenceFailure("currency");
    } finally {
      setSavingCurrency(null);
    }
  };

  const changeAmountDisplay = async (next: AmountDisplayMode) => {
    if (next === runtime.amountDisplay || savingAmountDisplay) return;
    setSavingAmountDisplay(next);
    setPreferenceFailure(null);
    try {
      await saveWithMinimumCue(() => runtime.saveAmountDisplay(next));
    } catch {
      setPreferenceFailure("amountDisplay");
    } finally {
      setSavingAmountDisplay(null);
    }
  };

  const changeBuiltInCategories = async (show: boolean) => {
    if (
      show === runtime.showBuiltInCategories ||
      savingBuiltInCategories !== null
    ) {
      return;
    }
    setSavingBuiltInCategories(show);
    setPreferenceFailure(null);
    try {
      await saveWithMinimumCue(() => runtime.saveShowBuiltInCategories(show));
    } catch {
      setPreferenceFailure("categories");
    } finally {
      setSavingBuiltInCategories(null);
    }
  };

  const changeTextSize = async (textSize: TextSizePreference) => {
    if (textSize === runtime.textSize || savingTextSize) return;
    setSavingTextSize(textSize);
    setPreferenceFailure(null);
    try {
      await saveWithMinimumCue(() => runtime.saveTextSize(textSize));
    } catch {
      setPreferenceFailure("textSize");
    } finally {
      setSavingTextSize(null);
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
            className={preferenceButtonClass(
              locale === "cs",
              savingLocale === "cs",
            )}
            type="button"
            aria-pressed={locale === "cs"}
            aria-busy={savingLocale === "cs"}
            disabled={savingLocale !== null}
            onClick={() => void changeLocale("cs")}
          >
            {t("settings.czech")}
          </button>
          <button
            className={preferenceButtonClass(
              locale === "en",
              savingLocale === "en",
            )}
            type="button"
            aria-pressed={locale === "en"}
            aria-busy={savingLocale === "en"}
            disabled={savingLocale !== null}
            onClick={() => void changeLocale("en")}
          >
            {t("settings.english")}
          </button>
          <button
            className={preferenceButtonClass(
              locale === "ja",
              savingLocale === "ja",
            )}
            type="button"
            aria-pressed={locale === "ja"}
            aria-busy={savingLocale === "ja"}
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
          <h2>{t("settings.textSize")}</h2>
          <p>{t("settings.textSizeDescription")}</p>
        </div>
        <div
          className="language-options text-size-options"
          role="group"
          aria-label={t("settings.textSize")}
        >
          {(
            [
              ["standard", t("settings.textSizeStandard")],
              ["large", t("settings.textSizeLarge")],
              ["extra-large", t("settings.textSizeExtraLarge")],
            ] as const
          ).map(([value, label]) => (
            <button
              className={preferenceButtonClass(
                runtime.textSize === value,
                savingTextSize === value,
              )}
              type="button"
              key={value}
              aria-pressed={runtime.textSize === value}
              aria-busy={savingTextSize === value}
              disabled={savingTextSize !== null}
              onClick={() => void changeTextSize(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {preferenceFailure === "textSize" ? (
          <p className="settings-inline-error" role="alert">
            {t("settings.textSizeSaveError")}
          </p>
        ) : null}
        {savingTextSize ? (
          <p className="sr-only" role="status" aria-live="polite">
            {t("settings.savingTextSize")}
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
              className={preferenceButtonClass(
                runtime.currencyPreference === value,
                savingCurrency === value,
              )}
              type="button"
              key={value}
              aria-pressed={runtime.currencyPreference === value}
              aria-busy={savingCurrency === value}
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

      <section className="settings-section">
        <div>
          <h2>{t("settings.amountDisplay")}</h2>
          <p>{t("settings.amountDisplayDescription")}</p>
        </div>
        <div
          className="language-options"
          role="group"
          aria-label={t("settings.amountDisplay")}
        >
          {(
            [
              ["exact", t("settings.amountDisplayExact")],
              ["whole", t("settings.amountDisplayWhole")],
            ] as const
          ).map(([value, label]) => (
            <button
              className={preferenceButtonClass(
                runtime.amountDisplay === value,
                savingAmountDisplay === value,
              )}
              type="button"
              key={value}
              aria-pressed={runtime.amountDisplay === value}
              aria-busy={savingAmountDisplay === value}
              disabled={savingAmountDisplay !== null}
              onClick={() => void changeAmountDisplay(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {preferenceFailure === "amountDisplay" ? (
          <p className="settings-inline-error" role="alert">
            {t("settings.amountDisplaySaveError")}
          </p>
        ) : null}
        {savingAmountDisplay ? (
          <p className="sr-only" role="status" aria-live="polite">
            {t("settings.savingAmountDisplay")}
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
        {runtime.canManageHouseholdData ? (
          <>
            <div
              className="language-options"
              role="group"
              aria-label={t("settings.builtInCategories")}
            >
              <button
                className={preferenceButtonClass(
                  runtime.showBuiltInCategories,
                  savingBuiltInCategories === true,
                )}
                type="button"
                aria-pressed={runtime.showBuiltInCategories}
                aria-busy={savingBuiltInCategories === true}
                disabled={savingBuiltInCategories !== null}
                onClick={() => void changeBuiltInCategories(true)}
              >
                {t("settings.showBuiltInCategories")}
              </button>
              <button
                className={preferenceButtonClass(
                  !runtime.showBuiltInCategories,
                  savingBuiltInCategories === false,
                )}
                type="button"
                aria-pressed={!runtime.showBuiltInCategories}
                aria-busy={savingBuiltInCategories === false}
                disabled={savingBuiltInCategories !== null}
                onClick={() => void changeBuiltInCategories(false)}
              >
                {t("settings.hideBuiltInCategories")}
              </button>
            </div>
            <p className="field-hint">
              {t("settings.builtInCategoriesDescription")}
            </p>
          </>
        ) : null}
        <Link
          className="button button-secondary"
          to={`${runtime.basePath}/settings/categories`}
        >
          <Tags size={18} aria-hidden="true" />
          {t("settings.manageCategories")}
        </Link>
        {preferenceFailure === "categories" ? (
          <p className="settings-inline-error" role="alert">
            {t("settings.categoryPreferenceSaveError")}
          </p>
        ) : null}
        {savingBuiltInCategories !== null ? (
          <p className="sr-only" role="status" aria-live="polite">
            {t("settings.savingCategoryPreference")}
          </p>
        ) : null}
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
