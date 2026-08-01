import { expect, test, type Page } from "@playwright/test";
import { clickVisible } from "./helpers";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthBounds(date: Date) {
  return {
    from: localDateKey(new Date(date.getFullYear(), date.getMonth() - 1, 1)),
    to: localDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

async function openPeriodDialog(page: Page) {
  await page.locator(".period-trigger").click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("shares month, year, and custom periods with an accessible graph", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
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

  await page.goto("/demo/graphs");
  await expect(
    page.getByRole("heading", { name: "Příjmy a výdaje" }),
  ).toBeVisible();
  await expect(page.locator(".chart-bucket")).toHaveCount(6);
  await expect(
    page.getByRole("heading", { name: "Kategorie", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".category-pie")).toHaveCount(2);
  const incomePie = page
    .locator(".category-pie-card")
    .filter({ hasText: "Příjmy podle kategorií" });
  const expensePie = page
    .locator(".category-pie-card")
    .filter({ hasText: "Výdaje podle kategorií" });
  await expect(incomePie.locator(".category-pie-legend li")).toHaveCount(1);
  await expect(expensePie.locator(".category-pie-legend li")).toHaveCount(4);
  await expect(expensePie.getByText("Ostatní", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/ludcount-period-graphs-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await openPeriodDialog(page);
  await page.getByRole("button", { name: "Rok", exact: true }).click();
  const currentYear = String(new Date().getFullYear());
  await page.getByLabel("Rok").fill(currentYear);
  await page
    .getByRole("button", { name: "Použít období" })
    .dispatchEvent("click");
  await expect(page.locator(".period-trigger")).toHaveText(currentYear);

  await clickVisible(page.getByRole("link", { name: "Záznamy" }));
  await expect(page.locator(".period-trigger")).toHaveText(currentYear);

  const range = monthBounds(new Date());
  await openPeriodDialog(page);
  const rangeMode = page.getByRole("button", { name: "Od–do" });
  await rangeMode.dispatchEvent("click");
  const periodDialog = page.getByRole("dialog");
  await periodDialog.getByLabel("Od", { exact: true }).fill(range.from);
  await periodDialog.getByLabel("Do", { exact: true }).fill(range.to);
  await page
    .getByRole("button", { name: "Použít období" })
    .dispatchEvent("click");
  await expect(page.getByText("Výsledky: 8")).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Přehled" }));
  await expect(page.locator(".period-trigger")).toContainText("–");

  await clickVisible(page.getByRole("link", { name: "Grafy" }));
  await openPeriodDialog(page);
  await page.getByRole("button", { name: "Rok", exact: true }).click();
  await page.getByLabel("Rok").fill("1900");
  await page
    .getByRole("button", { name: "Použít období" })
    .dispatchEvent("click");
  await expect(
    page.getByText("Pro toto období nejsou k dispozici data pro graf."),
  ).toBeVisible();
  await expect(
    page.getByText("V tomto období nejsou žádné příjmy."),
  ).toBeVisible();
  await expect(
    page.getByText("V tomto období nejsou žádné výdaje."),
  ).toBeVisible();

  await openPeriodDialog(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(firebaseRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
