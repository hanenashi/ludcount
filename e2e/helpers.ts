import { expect, type APIRequestContext, type Locator } from "@playwright/test";

const AUTH_EMULATOR_URL =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

export async function seedExistingUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const response = await request.post(
    `${AUTH_EMULATOR_URL}/accounts:signUp?key=emulator-test-key`,
    {
      data: { email, password, returnSecureToken: true },
    },
  );
  expect(response.ok()).toBe(true);
}

export async function clickVisible(locator: Locator): Promise<void> {
  await locator.first().waitFor({ state: "attached" });
  for (let index = 0; index < (await locator.count()); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) {
      await candidate.click();
      return;
    }
  }
  throw new Error("No visible matching control was found.");
}
