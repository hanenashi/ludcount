import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../../i18n";

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();

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
            onClick={() => setLocale("cs")}
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
            onClick={() => setLocale("en")}
          >
            {t("settings.english")}
          </button>
        </div>
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
          onClick={async () => {
            await signOutUser();
            navigate("/sign-in");
          }}
        >
          <LogOut size={18} aria-hidden="true" />
          {t("nav.signOut")}
        </button>
      </section>

      <p className="version-copy">{t("settings.version")} 0.1.0</p>
    </div>
  );
}
