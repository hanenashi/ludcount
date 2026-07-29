import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n";
import { useAuth } from "../auth/AuthProvider";
import { useHousehold } from "../household/HouseholdProvider";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { user, signOutUser } = useAuth();
  const { saveLocale, preferenceError } = useHousehold();
  const [savingLocale, setSavingLocale] = useState<"cs" | "en" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const navigate = useNavigate();

  const changeLocale = async (nextLocale: "cs" | "en") => {
    if (nextLocale === locale || savingLocale) {
      return;
    }
    setSavingLocale(nextLocale);
    try {
      await saveLocale(nextLocale);
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
        {preferenceError ? (
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
          <p>{t("settings.dataDescription")}</p>
        </div>
      </section>

      <section className="settings-section">
        <div>
          <h2>{t("settings.account")}</h2>
          <p>
            {t("settings.signedInAs")}: <strong>{user?.email}</strong>
          </p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            setSignOutError(false);
            void signOutUser()
              .then(() => navigate("/sign-in"))
              .catch(() => setSignOutError(true))
              .finally(() => setSigningOut(false));
          }}
        >
          <LogOut size={18} aria-hidden="true" />
          {signingOut ? t("common.working") : t("nav.signOut")}
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
