import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { getAuthErrorKey } from "./authErrors";

describe("authentication error mapping", () => {
  it.each([
    ["auth/invalid-email", "auth.error.invalidEmail"],
    ["auth/too-many-requests", "auth.error.tooManyRequests"],
    ["auth/network-request-failed", "auth.error.network"],
    ["auth/popup-blocked", "auth.error.popupBlocked"],
    ["auth/operation-not-allowed", "auth.error.unavailable"],
  ])("maps %s to a safe localized message key", (code, expectedKey) => {
    expect(
      getAuthErrorKey(new FirebaseError(code, "raw technical detail")),
    ).toBe(expectedKey);
  });

  it("uses a generic fallback without exposing unknown error text", () => {
    expect(
      getAuthErrorKey(
        new FirebaseError("auth/unexpected", "raw technical detail"),
      ),
    ).toBe("auth.error.generic");
    expect(getAuthErrorKey(new Error("raw technical detail"))).toBe(
      "auth.error.generic",
    );
  });
});
