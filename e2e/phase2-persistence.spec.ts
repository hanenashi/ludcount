import { expect, test } from "@playwright/test";
import { clickVisible, seedExistingUser } from "./helpers";

test("persists an invited user's household, transactions, and locale through Firestore", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(60_000);
  const email = `phase2-${testInfo.project.name}-${Date.now()}@example.test`;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await seedExistingUser(request, email, "phase2-test-password");
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("phase2-test-password");
  await page.getByRole("button", { name: "Přihlásit se" }).click();

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
