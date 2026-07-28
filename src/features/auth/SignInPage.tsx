import { FirebaseError } from "firebase/app";
import { WalletCards } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useI18n } from "../../i18n";
import { useAuth } from "./AuthProvider";

type AuthMode = "signIn" | "signUp" | "reset";

function getAuthErrorKey(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "auth.error.generic" as const;
  }
  if (
    error.code === "auth/invalid-credential" ||
    error.code === "auth/wrong-password" ||
    error.code === "auth/user-not-found"
  ) {
    return "auth.error.invalidCredentials" as const;
  }
  if (error.code === "auth/email-already-in-use") {
    return "auth.error.emailInUse" as const;
  }
  if (error.code === "auth/weak-password") {
    return "auth.error.weakPassword" as const;
  }
  if (error.code === "auth/popup-closed-by-user") {
    return "auth.error.popupClosed" as const;
  }
  return "auth.error.generic" as const;
}

export function SignInPage() {
  const { t } = useI18n();
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      } else if (mode === "signUp") {
        await signUpWithEmail(email, password);
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
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(t(getAuthErrorKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand brand-large">
          <span className="brand-mark" aria-hidden="true">
            <WalletCards size={27} />
          </span>
          <span>Ludcount</span>
        </div>
        <div>
          <h1>{t("auth.heading")}</h1>
          <p>{t("auth.description")}</p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <h2>
            {mode === "reset"
              ? t("auth.resetHeading")
              : mode === "signUp"
                ? t("auth.signUp")
                : t("auth.signIn")}
          </h2>
          {mode === "reset" ? <p>{t("auth.resetDescription")}</p> : null}

          <label className="field">
            <span>{t("auth.email")}</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {mode !== "reset" ? (
            <label className="field">
              <span>{t("auth.password")}</span>
              <input
                required
                minLength={6}
                type="password"
                autoComplete={
                  mode === "signUp" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          ) : null}

          {errorMessage ? (
            <p className="form-notice form-notice-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="form-notice form-notice-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <button
            className="button button-primary button-full"
            disabled={submitting}
          >
            {mode === "reset"
              ? t("auth.sendReset")
              : mode === "signUp"
                ? t("auth.signUp")
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
              <>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setMode("reset")}
                >
                  {t("auth.forgotPassword")}
                </button>
                <span>
                  {t("auth.noAccount")}{" "}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setMode("signUp")}
                  >
                    {t("auth.createAccount")}
                  </button>
                </span>
              </>
            ) : (
              <button
                className="text-button"
                type="button"
                onClick={() => setMode("signIn")}
              >
                {t("auth.backToSignIn")}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
