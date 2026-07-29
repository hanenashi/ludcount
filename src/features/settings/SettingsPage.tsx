import { LogOut, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppRuntime } from "../../app/AppRuntime";
import { useI18n } from "../../i18n";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const runtime = useAppRuntime();
  const [savingLocale, setSavingLocale] = useState<"cs" | "en" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [demoReset, setDemoReset] = useState(false);
  const navigate = useNavigate();

  const changeLocale = async (nextLocale: "cs" | "en") => {
    if (nextLocale === locale || savingLocale) {
      return;
    }
    setSavingLocale(nextLocale);
    try {
      await runtime.saveLocale(nextLocale);
      setLocale(nextLocale);
    } catch {
      // The provider exposes the localized write state below.
    } finally {
      setSavingLocale(null);
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
        </div>
        {runtime.preferenceError ? (
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
          <h2>{t("settings.dataHeading")}</h2>
          <p>
            {runtime.mode === "demo"
              ? t("demo.settingsDescription")
              : t("settings.dataDescription")}
          </p>
        </div>
        {runtime.resetDemo ? (
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
        ) : null}
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

      <p className="version-copy">{t("settings.version")} 0.1.0</p>
    </div>
  );
}
