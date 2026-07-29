import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { SkipLink } from "../../components/SkipLink";
import { useI18n } from "../../i18n";
import { getAccessRequestUrl } from "../../lib/publicConfig";
import { getAuthErrorKey } from "./authErrors";
import { useAuth } from "./AuthProvider";

type AuthMode = "signIn" | "reset";

export function SignInPage() {
  const { t } = useI18n();
  const { user, signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const accessRequestUrl = getAccessRequestUrl();

  if (user) {
    return <Navigate to="/app/overview" replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      if (mode === "reset") {
        await resetPassword(email);
        setSuccessMessage(t("auth.resetSent"));
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      setErrorMessage(t(getAuthErrorKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const googleSignIn = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(t(getAuthErrorKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <>
      <SkipLink targetId="auth-content" />
      <main className="auth-page" id="auth-content" tabIndex={-1}>
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <div className="brand brand-large">
            <img
              className="brand-logo brand-logo-auth"
              src="/prsk-256.png"
              alt=""
              aria-hidden="true"
            />
            <span>Ludcount</span>
          </div>
          <div>
            <h1 id="auth-intro-title">{t("auth.heading")}</h1>
            <p>{t("auth.description")}</p>
          </div>
        </section>

        <section className="auth-panel">
          <form
            className="auth-form"
            onSubmit={submit}
            aria-labelledby="auth-form-title"
            aria-busy={submitting}
          >
            <h2 id="auth-form-title">
              {mode === "reset" ? t("auth.resetHeading") : t("auth.signIn")}
            </h2>
            {mode === "reset" ? <p>{t("auth.resetDescription")}</p> : null}

            <label className="field" htmlFor="auth-email">
              <span>{t("auth.email")}</span>
              <input
                id="auth-email"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {mode === "signIn" ? (
              <label className="field" htmlFor="auth-password">
                <span>{t("auth.password")}</span>
                <input
                  id="auth-password"
                  required
                  minLength={6}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            ) : null}

            {errorMessage ? (
              <p
                className="form-notice form-notice-error"
                id="auth-feedback"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p
                className="form-notice form-notice-success"
                id="auth-feedback"
                role="status"
                aria-live="polite"
              >
                {successMessage}
              </p>
            ) : null}

            <button
              className="button button-primary button-full"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? t("common.working")
                : mode === "reset"
                  ? t("auth.sendReset")
                  : t("auth.signIn")}
            </button>

            {mode !== "reset" ? (
              <>
                <div className="form-divider" aria-hidden="true">
                  <span />
                </div>
                <button
                  className="button button-secondary button-full"
                  type="button"
                  disabled={submitting}
                  onClick={googleSignIn}
                >
                  <span className="google-mark" aria-hidden="true">
                    G
                  </span>
                  {t("auth.google")}
                </button>
              </>
            ) : null}

            <div className="auth-links">
              {mode === "signIn" ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => changeMode("reset")}
                >
                  {t("auth.forgotPassword")}
                </button>
              ) : (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => changeMode("signIn")}
                >
                  {t("auth.backToSignIn")}
                </button>
              )}
            </div>

            <div className="invitation-notice" role="note">
              <strong>{t("auth.invitationOnly")}</strong>
              {accessRequestUrl ? (
                <a className="text-link" href={accessRequestUrl}>
                  {t("auth.requestAccess")}
                </a>
              ) : (
                <span>{t("auth.requestAccessPending")}</span>
              )}
            </div>

            <Link className="button button-demo button-full" to="/demo">
              {t("demo.try")}
            </Link>
          </form>
        </section>
      </main>
    </>
  );
}
