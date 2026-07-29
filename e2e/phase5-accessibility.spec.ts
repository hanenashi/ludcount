import { expect, test, type Locator, type Page } from "@playwright/test";
import { seedExistingUser } from "./helpers";

async function visible(locator: Locator): Promise<Locator> {
  await locator.first().waitFor({ state: "attached" });
  for (let index = 0; index < (await locator.count()); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) {
      return candidate;
    }
  }
  throw new Error("No visible matching control was found.");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("supports keyboard navigation, dialog focus, and narrow layouts", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  const email = `phase5-${testInfo.project.name}-${Date.now()}@example.test`;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await seedExistingUser(request, email, "phase5-test-password");
  await page.goto("/sign-in");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", {
    name: "Přeskočit na hlavní obsah",
  });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#auth-content")).toBeFocused();
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("phase5-test-password");
  await page.getByRole("button", { name: "Přihlásit se" }).click();

  const transactionsLink = await visible(
    page.getByRole("link", { name: "Záznamy" }),
  );
  await transactionsLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/transactions$/);

  const addLink = await visible(
    page.getByRole("link", { name: "Přidat záznam" }),
  );
  await addLink.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Částka")).toBeFocused();
  await page.getByLabel("Částka").fill("125,50");
  await page.getByLabel("Poznámka").fill("Klávesnicový test");
  const saveButton = page.getByRole("button", { name: "Uložit výdaj" });
  await saveButton.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/transactions$/);
  await expect(page.getByText("Klávesnicový test")).toBeVisible();

  const filterSummary = page.locator(".transaction-filters summary");
  await filterSummary.focus();
  const focusStyle = await filterSummary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Enter");
  await expect(page.locator(".transaction-filters")).toHaveAttribute(
    "open",
    "",
  );
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Typ záznamu")).toBeFocused();

  const deleteButton = page.getByRole("button", {
    name: /Smazat.*Potraviny/,
  });
  await deleteButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  const cancelButton = page.getByRole("button", { name: "Zrušit" });
  await expect(cancelButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Smazat", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancelButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
  await expect(deleteButton).toBeFocused();

  const settingsLink = await visible(
    page.getByRole("link", { name: "Nastavení" }),
  );
  await settingsLink.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Nastavení" })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("button", { name: "Čeština" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expectNoHorizontalOverflow(page);

  const minimumTouchTarget = await page
    .getByRole("button", { name: "Angličtina" })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(minimumTouchTarget).toBeGreaterThanOrEqual(44);
  expect(consoleErrors).toEqual([]);

  await page.screenshot({
    path: `/tmp/ludcount-phase5-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
