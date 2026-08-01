import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { clickVisible, dismissAmountPad, fillAmount } from "./helpers";

function isFirebaseBackendRequest(urlValue: string): boolean {
  const url = new URL(urlValue);
  return (
    ["8080", "9099"].includes(url.port) ||
    [
      "firestore.googleapis.com",
      "identitytoolkit.googleapis.com",
      "securetoken.googleapis.com",
      "firebaseappcheck.googleapis.com",
      "firebaseinstallations.googleapis.com",
    ].includes(url.hostname)
  );
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("runs the complete demo locally without Firebase access", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const firebaseRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    if (isFirebaseBackendRequest(request.url())) {
      firebaseRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/demo");
  await expect(page).toHaveURL(/\/demo\/overview$/);
  await expect(page).toHaveTitle("Ludcount");
  await expect(
    page.getByText("Ukázkový režim — změny se neukládají."),
  ).toBeVisible();
  await expect(page.getByText("Víkendový nákup")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(firebaseRequests).toEqual([]);

  await expect(page.locator(".app-main h1")).toBeFocused();

  await clickVisible(page.getByRole("link", { name: "Záznamy" }));
  await expect(page.getByText("Výsledky: 6")).toBeVisible();
  await page.locator(".transaction-filters summary").click();
  await page.getByLabel("Typ záznamu").selectOption("expense");
  await page.getByLabel("Kategorie").selectOption("expense.groceries");
  await page.getByLabel("Hledat v poznámkách").fill("VÍKENDOVÝ");
  await expect(page.getByText("Výsledky: 1")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportovat CSV" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const csv = await readFile(downloadPath as string);
  expect(Array.from(csv.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  expect(csv.toString("utf8")).toContain("Víkendový nákup");
  await page.getByRole("button", { name: "Obnovit filtry" }).click();

  const groceriesRow = page
    .locator(".transaction-row")
    .filter({ hasText: "Víkendový nákup" });
  const editLink = groceriesRow.getByRole("link", { name: /Upravit/ });
  await editLink.focus();
  await page.keyboard.press("Enter");
  await dismissAmountPad(page);
  await page.getByLabel("Poznámka").fill("Upravená ukázka");
  const saveChanges = page.getByRole("button", { name: "Uložit změny" });
  await saveChanges.focus();
  await saveChanges.press("Enter");
  await expect(page).toHaveURL(/\/demo\/transactions$/);
  await expect(page.getByText("Upravená ukázka")).toBeVisible();

  const editedRow = page
    .locator(".transaction-row")
    .filter({ hasText: "Upravená ukázka" });
  await editedRow.getByRole("link", { name: /Duplikovat/ }).click();
  await expect(
    page.getByRole("heading", { name: "Duplikovat výdaj" }),
  ).toBeVisible();
  await dismissAmountPad(page);
  await page.getByLabel("Poznámka").fill("Duplikovaná ukázka");
  const saveDuplicate = page.getByRole("button", { name: "Uložit výdaj" });
  await saveDuplicate.focus();
  await saveDuplicate.press("Enter");
  await expect(page.getByText("Duplikovaná ukázka")).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Přidat záznam" }));
  await fillAmount(page, "123,45");
  await page.getByLabel("Poznámka").fill("Dočasná změna");
  await page.getByRole("button", { name: "Uložit výdaj" }).click();
  await expect(page.getByText("Dočasná změna")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Výsledky: 6")).toBeVisible();
  await expect(page.getByText("Víkendový nákup")).toBeVisible();
  await expect(page.getByText("Dočasná změna")).toHaveCount(0);
  await expect(page.getByText("Upravená ukázka")).toHaveCount(0);

  const restoredRow = page
    .locator(".transaction-row")
    .filter({ hasText: "Víkendový nákup" });
  await restoredRow.getByRole("button", { name: /Smazat/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Smazat", exact: true }).click();
  await expect(page.getByText("Výsledky: 5")).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Nastavení" }));
  await page.getByRole("button", { name: "Obnovit demo" }).click();
  await expect(
    page.getByText("Původní ukázková data byla obnovena."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Angličtina" }).click();
  await expect(
    page.getByText("Demo mode — changes are not saved."),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await clickVisible(page.getByRole("link", { name: "Transactions" }));
  await expect(page.getByText("Results: 6")).toBeVisible();
  expect(firebaseRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  await page.screenshot({
    path: `/tmp/ludcount-demo-${testInfo.project.name}.png`,
    fullPage: false,
  });

  await page.getByRole("button", { name: "Exit demo" }).first().click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
