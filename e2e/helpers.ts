import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";

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

export async function fillAmount(
  page: Page,
  value: string,
  labels: {
    amount: string;
    pad: string;
    decimal: string;
    backspace: string;
    done: string;
  } = {
    amount: "Částka",
    pad: "Číselná klávesnice pro částku",
    decimal: "Desetinná čárka",
    backspace: "Smazat poslední číslici",
    done: "Hotovo",
  },
): Promise<void> {
  const amount = page.getByLabel(labels.amount, { exact: true });
  if (await amount.isEditable()) {
    await amount.fill(value);
    return;
  }

  await amount.click();
  const pad = page.getByRole("group", {
    name: labels.pad,
  });
  await pad.waitFor();
  const currentValue = await amount.inputValue();
  for (let index = 0; index < currentValue.length; index += 1) {
    await pad.getByRole("button", { name: labels.backspace }).click();
  }
  for (const character of value) {
    if (character === "," || character === ".") {
      await pad.getByRole("button", { name: labels.decimal }).click();
    } else {
      await pad.getByRole("button", { name: character, exact: true }).click();
    }
  }
  await pad.getByRole("button", { name: labels.done }).click();
}
