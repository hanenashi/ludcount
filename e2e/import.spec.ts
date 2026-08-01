import { expect, test, type Page } from "@playwright/test";
import { clickVisible, seedExistingUser } from "./helpers";

const headers = [
  "sourceApp",
  "sourceId",
  "date",
  "sourceTime",
  "type",
  "amountMinor",
  "currency",
  "categorySourceId",
  "category",
  "note",
  "sourcePaymentId",
  "sourceShopId",
];

function row(values: readonly string[]) {
  return values.map((value) => `"${value.replaceAll('"', '""')}"`).join(";");
}

function importCsv() {
  return `\uFEFF${row(headers)}\n${row([
    "okane-reco",
    "90001",
    "2026-08-01",
    "10:15",
    "expense",
    "45670",
    "CZK",
    "71",
    "Rodinný nákup",
    'Pečivo; "bio"',
    "1",
    "2",
  ])}\n${row([
    "okane-reco",
    "90002",
    "2026-08-02",
    "08:00",
    "income",
    "120000",
    "CZK",
    "72",
    "臨時収入",
    "Vrácené peníze",
    "0",
    "0",
  ])}\n`;
}

async function selectImportFile(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "okane-reco-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(importCsv(), "utf8"),
  });
}

test("previews and idempotently imports a canonical Okanereco CSV", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  const email = `import-${testInfo.project.name}-${Date.now()}@example.test`;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await seedExistingUser(request, email, "import-test-password");
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("import-test-password");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/app\/overview$/, { timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Přehled" })).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Nastavení" }));
  await expect(
    page.getByRole("heading", { name: "Import CSV z Okanereco" }),
  ).toBeVisible();
  await selectImportFile(page);
  await expect(
    page.getByRole("heading", { name: "Náhled importu" }),
  ).toBeVisible();
  await expect(page.getByText("okane-reco-import.csv")).toBeVisible();
  await expect(
    page.getByText("Již importováno").locator("..").getByText("0"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Importovat transakce (2)" }).click();
  await expect(page.getByText(/Importované transakce: 2/)).toBeVisible({
    timeout: 15_000,
  });

  await clickVisible(page.getByRole("link", { name: "Záznamy" }));
  const rows = page.locator(".transaction-row");
  await expect(rows.getByText('Pečivo; "bio"')).toBeVisible();
  await expect(rows.getByText(/Vrácené peníze$/)).toBeVisible();
  await expect(rows.getByText("Rodinný nákup", { exact: true })).toBeVisible();
  await expect(rows.getByText("臨時収入", { exact: true })).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Nastavení" }));
  await selectImportFile(page);
  await expect(
    page.getByText("Již importováno").locator("..").getByText("2"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Importovat transakce (0)" }),
  ).toBeDisabled();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(consoleErrors).toEqual([]);
});
