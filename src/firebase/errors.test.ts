import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { DataOperationError, assertOnline, normalizeDataError } from "./errors";

describe("Firestore error mapping", () => {
  it("maps permission and availability failures to explicit UI states", () => {
    expect(
      normalizeDataError(new FirebaseError("permission-denied", "denied")).kind,
    ).toBe("permission-denied");
    expect(
      normalizeDataError(new FirebaseError("unavailable", "offline")).kind,
    ).toBe("offline");
    expect(
      normalizeDataError(new FirebaseError("deadline-exceeded", "slow")).kind,
    ).toBe("timeout");
  });

  it("preserves existing operation errors", () => {
    const error = new DataOperationError("invalid-data", "invalid");
    expect(normalizeDataError(error)).toBe(error);
  });

  it("rejects writes while the browser reports offline", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    expect(() => assertOnline()).toThrow(DataOperationError);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });
});
