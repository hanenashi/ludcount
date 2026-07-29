import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function clickVisible(locator: Locator): Promise<void> {
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

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousMonthDateKey(today: Date): string {
  return localDateKey(new Date(today.getFullYear(), today.getMonth() - 1, 15));
}

async function addTransaction(
  page: Page,
  values: {
    type: "expense" | "income";
    amount: string;
    note: string;
    dateKey: string;
  },
): Promise<void> {
  await clickVisible(page.getByRole("link", { name: "Přidat záznam" }));
  if (values.type === "income") {
    await page.getByRole("button", { name: "Příjem" }).click();
  }
  await page.getByLabel("Částka").fill(values.amount);
  await page.getByLabel("Datum").fill(values.dateKey);
  await page.getByLabel("Poznámka").fill(values.note);
  await page
    .getByRole("button", {
      name: values.type === "income" ? "Uložit příjem" : "Uložit výdaj",
    })
    .click();
  await expect(page).toHaveURL(/\/app\/transactions$/);
}

test("filters, searches, duplicates, and exports transactions", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const today = new Date();
  const todayKey = localDateKey(today);
  const monthKey = todayKey.slice(0, 7);
  const email = `phase4-${testInfo.project.name}-${Date.now()}@example.test`;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("phase4-test-password");
  await page.getByRole("button", { name: "Vytvořit účet" }).last().click();

  await expect(
    page.getByRole("link", { name: "Přidat záznam" }).first(),
  ).toBeAttached({ timeout: 15_000 });
  await addTransaction(page, {
    type: "expense",
    amount: "850,50",
    note: "Týdenní nákup",
    dateKey: todayKey,
  });
  await addTransaction(page, {
    type: "income",
    amount: "50000,00",
    note: "ČERVENCOVÁ výplata",
    dateKey: todayKey,
  });
  await addTransaction(page, {
    type: "expense",
    amount: "125,25",
    note: "Starší nákup",
    dateKey: previousMonthDateKey(today),
  });

  await expect(page.getByText("Výsledky: 2")).toBeVisible();
  await page.locator(".transaction-filters summary").click();
  await page.getByLabel("Typ záznamu").selectOption("expense");
  await page.getByLabel("Kategorie").selectOption("expense.groceries");
  await page.getByLabel("Hledat v poznámkách").fill("NÁKUP");

  await expect(page.getByText("Výsledky: 1")).toBeVisible();
  await expect(page.getByText("Týdenní nákup")).toBeVisible();
  await expect(page.getByText("ČERVENCOVÁ výplata")).not.toBeVisible();

  await page.getByLabel("Hledat v poznámkách").fill("nenalezeno");
  await expect(
    page.getByText("Těmto filtrům neodpovídají žádné záznamy."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Obnovit filtry" }).click();
  await expect(page.getByText("Výsledky: 2")).toBeVisible();

  const shoppingRow = page
    .locator(".transaction-row")
    .filter({ hasText: "Týdenní nákup" });
  await shoppingRow.getByRole("link", { name: "Duplikovat" }).click();
  await expect(
    page.getByRole("heading", { name: "Duplikovat výdaj" }),
  ).toBeVisible();
  await expect(page.getByLabel("Částka")).toHaveValue("850,50");
  await expect(page.getByLabel("Kategorie")).toHaveValue("expense.groceries");
  await expect(page.getByLabel("Datum")).toHaveValue(todayKey);
  await expect(page.getByLabel("Poznámka")).toHaveValue("Týdenní nákup");

  await page.getByRole("button", { name: "Zrušit" }).click();
  await expect(page.getByText("Týdenní nákup")).toHaveCount(1);
  await page
    .locator(".transaction-row")
    .filter({ hasText: "Týdenní nákup" })
    .getByRole("link", { name: "Duplikovat" })
    .click();
  await page.getByRole("button", { name: "Uložit výdaj" }).click();
  await expect(page.getByText("Týdenní nákup")).toHaveCount(2);

  await page.getByText("Filtry a hledání").click();
  await page.getByLabel("Typ záznamu").selectOption("income");
  await expect(page.getByText("Výsledky: 1")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportovat CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`ludcount-${monthKey}.csv`);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const csvBuffer = await readFile(downloadPath as string);
  expect(Array.from(csvBuffer.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  const csv = csvBuffer.toString("utf8");
  expect(csv).toContain('"Datum";"Typ";"Částka";"Měna";"Kategorie";"Poznámka"');
  expect(csv).toContain('"ČERVENCOVÁ výplata"');
  expect(csv).not.toContain("Týdenní nákup");

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: `/tmp/ludcount-phase4-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
