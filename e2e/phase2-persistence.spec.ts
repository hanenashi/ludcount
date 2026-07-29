import { expect, test, type Locator } from "@playwright/test";

async function clickVisible(locator: Locator): Promise<void> {
  for (let index = 0; index < (await locator.count()); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) {
      await candidate.click();
      return;
    }
  }
  throw new Error("No visible matching control was found.");
}

test("persists a personal household, transactions, and locale through Firestore", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const email = `phase2-${testInfo.project.name}-${Date.now()}@example.test`;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("phase2-test-password");
  await page.getByRole("button", { name: "Vytvořit účet" }).last().click();

  await expect(
    page.getByRole("link", { name: "Přidat záznam" }).first(),
  ).toBeAttached({ timeout: 15_000 });
  await clickVisible(page.getByRole("link", { name: "Přidat záznam" }));

  await page.getByLabel("Částka").fill("850,50");
  await page.getByLabel("Poznámka").fill("Týdenní nákup");
  await page.getByRole("button", { name: "Uložit výdaj" }).click();
  await expect(page).toHaveURL(/\/app\/transactions$/);
  await expect(page.getByText(/850,50/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(/850,50/).first()).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Upravit" }));
  await page.getByLabel("Částka").fill("900,00");
  await page.getByRole("button", { name: "Uložit změny" }).click();
  await expect(page.getByText(/900,00/).first()).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Nastavení" }));
  await page.getByRole("button", { name: "Angličtina" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.evaluate(() => localStorage.removeItem("ludcount.locale"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await clickVisible(page.getByRole("link", { name: "Transactions" }));
  await expect(page.getByText(/900.00/).first()).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(
    page.getByText("There are no transactions to show."),
  ).toBeVisible();

  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: `/tmp/ludcount-phase2-persisted-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
