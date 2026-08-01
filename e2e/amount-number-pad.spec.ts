import { expect, test } from "@playwright/test";
import { expectCombinedAmountFocus } from "./helpers";

test("uses a compact amount number pad on touch devices", async ({
  page,
}, testInfo) => {
  const touchProject = testInfo.project.name !== "desktop-chromium";
  const firebaseRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (
      [
        "firestore.googleapis.com",
        "identitytoolkit.googleapis.com",
        "securetoken.googleapis.com",
        "firebaseappcheck.googleapis.com",
        "firebaseinstallations.googleapis.com",
      ].includes(host)
    ) {
      firebaseRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/demo/transactions/new");
  const amount = page.getByLabel("Částka");
  await expect(amount).toBeFocused();
  await expectCombinedAmountFocus(page);

  if (!touchProject) {
    await expect(amount).toHaveAttribute("inputmode", "decimal");
    await expect(
      page.getByRole("group", { name: "Číselná klávesnice pro částku" }),
    ).toHaveCount(0);
    await amount.fill("123,45");
    await amount.press("Tab");
  } else {
    await expect(amount).toHaveAttribute("inputmode", "none");
    await expect(amount).toHaveAttribute("readonly", "");
    const pad = page.getByRole("group", {
      name: "Číselná klávesnice pro částku",
    });
    await expect(pad).toBeVisible();
    await expect
      .poll(async () => {
        const currentPadBounds = await pad.boundingBox();
        const currentNavigationBounds = await page
          .locator(".mobile-navigation")
          .boundingBox();
        return (
          (currentPadBounds?.y ?? 0) +
          (currentPadBounds?.height ?? 0) -
          (currentNavigationBounds?.y ?? 0)
        );
      })
      .toBeLessThanOrEqual(0);
    const bounds = await pad.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.width).toBeLessThanOrEqual(270);
    expect(bounds?.height).toBeLessThanOrEqual(215);
    const navigationBounds = await page
      .locator(".mobile-navigation")
      .boundingBox();
    expect(navigationBounds).not.toBeNull();
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(
      navigationBounds?.y ?? 0,
    );

    for (const digit of ["1", "2", "3"] as const) {
      await pad.getByRole("button", { name: digit, exact: true }).click();
    }
    await pad.getByRole("button", { name: "Desetinná čárka" }).click();
    await pad.getByRole("button", { name: "4", exact: true }).click();
    await pad.getByRole("button", { name: "5", exact: true }).click();
    await expect(amount).toHaveValue("123,45");
    await pad.getByRole("button", { name: "Smazat poslední číslici" }).click();
    await expect(amount).toHaveValue("123,4");
    await pad.getByRole("button", { name: "5", exact: true }).click();
    await pad.getByRole("button", { name: "Hotovo" }).click();
    await expect(pad).not.toBeVisible();
    await expect(page.getByLabel("Kategorie")).toBeFocused();

    const unfocusedOutline = await page
      .locator(".money-input")
      .evaluate((control) => getComputedStyle(control).outlineStyle);
    expect(unfocusedOutline).toBe("none");

    await amount.click();
    await expect(pad).toBeVisible();
    await amount.press("Escape");
    await expect(pad).not.toBeVisible();
  }

  await page.getByRole("button", { name: "Příjem" }).click();
  await amount.click();
  await expectCombinedAmountFocus(page);
  if (touchProject) {
    const incomePad = page.getByRole("group", {
      name: "Číselná klávesnice pro částku",
    });
    for (let index = 0; index < 6; index += 1) {
      await incomePad
        .getByRole("button", { name: "Smazat poslední číslici" })
        .click();
    }
    await incomePad.getByRole("button", { name: "Hotovo" }).click();
  } else {
    await amount.fill("");
  }
  await page.getByRole("button", { name: "Uložit příjem" }).click();
  await expect(page.locator(".money-input")).toHaveClass(/field-error/);
  await expectCombinedAmountFocus(page, "Částka", "rgb(180, 35, 24)");

  for (const locale of [
    {
      id: "en",
      amount: "Amount",
      pad: "Amount number pad",
      decimal: "Decimal point",
    },
    {
      id: "ja",
      amount: "金額",
      pad: "金額の数字キーパッド",
      decimal: "小数点",
    },
  ]) {
    await page.evaluate(
      (localeId) => localStorage.setItem("ludcount.locale", localeId),
      locale.id,
    );
    await page.goto("/demo/transactions/new");
    const localizedAmount = page.getByLabel(locale.amount, { exact: true });
    await expect(localizedAmount).toBeFocused();
    await expectCombinedAmountFocus(page, locale.amount);
    if (touchProject) {
      const localizedPad = page.getByRole("group", { name: locale.pad });
      await localizedPad
        .getByRole("button", { name: "1", exact: true })
        .click();
      await localizedPad.getByRole("button", { name: locale.decimal }).click();
      await localizedPad
        .getByRole("button", { name: "5", exact: true })
        .click();
    } else {
      await localizedAmount.fill("1.5");
    }
    await expect(localizedAmount).toHaveValue("1.5");
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(firebaseRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: `/tmp/ludcount-amount-pad-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
