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

export async function dismissAmountPad(
  page: Page,
  doneLabel = "Hotovo",
): Promise<void> {
  const done = page.getByRole("button", { name: doneLabel, exact: true });
  if (await done.isVisible()) await done.click();
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

export async function expectCombinedAmountFocus(
  page: Page,
  amountLabel = "Částka",
  expectedColor = "rgb(215, 46, 39)",
): Promise<void> {
  const amount = page.getByLabel(amountLabel, { exact: true });
  const control = amount.locator("xpath=..");
  const styles = await control.evaluate((wrapper) => {
    const input = wrapper.querySelector("input");
    const symbol = wrapper.querySelector("span");
    const toggle = wrapper.querySelector(".amount-pad-toggle");
    if (!input || !symbol) throw new Error("Amount control is incomplete.");
    const inputStyle = getComputedStyle(input);
    const wrapperStyle = getComputedStyle(wrapper);
    const toggleStyle = toggle ? getComputedStyle(toggle) : null;
    const inputBounds = input.getBoundingClientRect();
    const symbolBounds = symbol.getBoundingClientRect();
    const toggleBounds = toggle?.getBoundingClientRect() ?? null;
    return {
      inputOutlineStyle: inputStyle.outlineStyle,
      inputBoxShadow: inputStyle.boxShadow,
      inputBorderRightWidth: inputStyle.borderRightWidth,
      wrapperOutlineStyle: wrapperStyle.outlineStyle,
      wrapperOutlineWidth: wrapperStyle.outlineWidth,
      wrapperOutlineColor: wrapperStyle.outlineColor,
      wrapperBorderColor: wrapperStyle.borderColor,
      inputToSymbolGap: symbolBounds.left - inputBounds.right,
      symbolToToggleGap: toggleBounds
        ? toggleBounds.left - symbolBounds.right
        : null,
      toggleBorderLeftStyle: toggleStyle?.borderLeftStyle ?? null,
      toggleBorderLeftWidth: toggleStyle?.borderLeftWidth ?? null,
    };
  });

  expect(styles.inputOutlineStyle).toBe("none");
  expect(styles.inputBoxShadow).toBe("none");
  expect(styles.inputBorderRightWidth).toBe("0px");
  expect(styles.wrapperOutlineStyle).toBe("solid");
  expect(styles.wrapperOutlineWidth).toBe("3px");
  expect(styles.wrapperOutlineColor).toBe(expectedColor);
  expect(styles.wrapperBorderColor).toBe(expectedColor);
  expect(Math.abs(styles.inputToSymbolGap)).toBeLessThanOrEqual(0.5);
  if (styles.symbolToToggleGap !== null) {
    expect(Math.abs(styles.symbolToToggleGap)).toBeLessThanOrEqual(0.5);
    expect(styles.toggleBorderLeftStyle).toBe("solid");
    expect(styles.toggleBorderLeftWidth).toBe("1px");
  }
}
