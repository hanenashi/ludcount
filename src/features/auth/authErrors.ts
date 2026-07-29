import { FirebaseError } from "firebase/app";
import type { TranslationKey } from "../../i18n/en";

const authErrorKeys: Readonly<Record<string, TranslationKey>> = {
  "auth/invalid-credential": "auth.error.invalidCredentials",
  "auth/wrong-password": "auth.error.invalidCredentials",
  "auth/user-not-found": "auth.error.invalidCredentials",
  "auth/email-already-in-use": "auth.error.emailInUse",
  "auth/weak-password": "auth.error.weakPassword",
  "auth/popup-closed-by-user": "auth.error.popupClosed",
  "auth/popup-blocked": "auth.error.popupBlocked",
  "auth/invalid-email": "auth.error.invalidEmail",
  "auth/user-disabled": "auth.error.userDisabled",
  "auth/too-many-requests": "auth.error.tooManyRequests",
  "auth/network-request-failed": "auth.error.network",
  "auth/operation-not-allowed": "auth.error.unavailable",
  "auth/provider-already-linked": "auth.error.unavailable",
};

export function getAuthErrorKey(error: unknown): TranslationKey {
  if (!(error instanceof FirebaseError)) {
    return "auth.error.generic";
  }
  return authErrorKeys[error.code] ?? "auth.error.generic";
}
