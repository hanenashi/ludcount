import { FirebaseError } from "firebase/app";

export const INVITATION_ONLY_ERROR_CODE = "auth/admin-restricted-operation";

export async function enforceExistingGoogleEnrollment({
  isNewUser,
  removeNewUser,
  signOutUser,
}: {
  isNewUser: boolean;
  removeNewUser: () => Promise<void>;
  signOutUser: () => Promise<void>;
}): Promise<void> {
  if (!isNewUser) {
    return;
  }

  try {
    await removeNewUser();
  } catch {
    await signOutUser();
  }

  throw new FirebaseError(
    INVITATION_ONLY_ERROR_CODE,
    "New end-user enrollment is disabled.",
  );
}
