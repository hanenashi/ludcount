import { describe, expect, it, vi } from "vitest";
import {
  enforceExistingGoogleEnrollment,
  INVITATION_ONLY_ERROR_CODE,
} from "./enrollment";

describe("invitation-only Google enrollment", () => {
  it("keeps an existing Firebase user signed in", async () => {
    const removeNewUser = vi.fn();
    const signOutUser = vi.fn();

    await expect(
      enforceExistingGoogleEnrollment({
        isNewUser: false,
        removeNewUser,
        signOutUser,
      }),
    ).resolves.toBeUndefined();
    expect(removeNewUser).not.toHaveBeenCalled();
    expect(signOutUser).not.toHaveBeenCalled();
  });

  it("removes a newly created identity before it can bootstrap a household", async () => {
    const removeNewUser = vi.fn().mockResolvedValue(undefined);
    const signOutUser = vi.fn();

    await expect(
      enforceExistingGoogleEnrollment({
        isNewUser: true,
        removeNewUser,
        signOutUser,
      }),
    ).rejects.toMatchObject({ code: INVITATION_ONLY_ERROR_CODE });
    expect(removeNewUser).toHaveBeenCalledOnce();
    expect(signOutUser).not.toHaveBeenCalled();
  });

  it("signs the new identity out if account cleanup fails", async () => {
    const removeNewUser = vi.fn().mockRejectedValue(new Error("blocked"));
    const signOutUser = vi.fn().mockResolvedValue(undefined);

    await expect(
      enforceExistingGoogleEnrollment({
        isNewUser: true,
        removeNewUser,
        signOutUser,
      }),
    ).rejects.toMatchObject({ code: INVITATION_ONLY_ERROR_CODE });
    expect(signOutUser).toHaveBeenCalledOnce();
  });
});
