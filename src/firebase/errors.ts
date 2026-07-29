import { FirebaseError } from "firebase/app";

export type DataErrorKind =
  | "offline"
  | "timeout"
  | "permission-denied"
  | "write-failure"
  | "invalid-data"
  | "unknown";

export class DataOperationError extends Error {
  readonly kind: DataErrorKind;
  readonly cause: unknown;

  constructor(kind: DataErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = "DataOperationError";
    this.kind = kind;
    this.cause = cause;
  }
}

export function normalizeDataError(
  error: unknown,
  fallbackKind: DataErrorKind = "unknown",
): DataOperationError {
  if (error instanceof DataOperationError) {
    return error;
  }

  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return new DataOperationError(
        "permission-denied",
        "Firestore denied the requested operation.",
        error,
      );
    }

    if (error.code === "deadline-exceeded") {
      return new DataOperationError(
        "timeout",
        "The data request exceeded its deadline.",
        error,
      );
    }

    if (
      error.code === "unavailable" ||
      error.code === "network-request-failed"
    ) {
      return new DataOperationError(
        "offline",
        "The data service is currently unavailable.",
        error,
      );
    }
  }

  return new DataOperationError(
    fallbackKind,
    error instanceof Error ? error.message : "An unknown data error occurred.",
    error,
  );
}

export function assertOnline(): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new DataOperationError(
      "offline",
      "This operation requires a network connection.",
    );
  }
}
