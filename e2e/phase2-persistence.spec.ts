import { expect, test } from "@playwright/test";
import {
  clickVisible,
  expectCombinedAmountFocus,
  fillAmount,
  seedExistingUser,
} from "./helpers";

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

  await clickVisible(page.getByRole("link", { name: "Nastavení" }));
  await page.getByRole("link", { name: "Spravovat kategorie" }).click();
  await page.getByLabel("Název kategorie").fill("Mazlíčci");
  await page.getByRole("button", { name: "Vytvořit kategorii" }).click();
  await expect(
    page.getByRole("listitem").getByRole("textbox", {
      name: "Název kategorie",
    }),
  ).toHaveValue("Mazlíčci");

  await clickVisible(page.getByRole("link", { name: "Záznamy" }));
  await clickVisible(page.getByRole("link", { name: "Přidat záznam" }));

  await expectCombinedAmountFocus(page);
  await fillAmount(page, "850,50");
  await page.getByLabel("Kategorie").selectOption({ label: "Mazlíčci" });
  await page.getByLabel("Poznámka").fill("Týdenní nákup");
  await page.getByRole("button", { name: "Uložit výdaj" }).click();
  await expect(page).toHaveURL(/\/app\/transactions$/);
  await expect(page.getByText(/850,50/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(/850,50/).first()).toBeVisible();
  await expect(
    page.locator(".transaction-row").getByText("Mazlíčci"),
  ).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Upravit" }));
  await fillAmount(page, "900,00");
  await page.getByRole("button", { name: "Uložit změny" }).click();
  await expect(page.getByText(/900,00/).first()).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "Nastavení" }));
  await page.getByRole("button", { name: "Japonština" }).click();
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  await expect(page.getByRole("button", { name: "自動 (¥)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "米ドル ($)" }).click();
  await expect(page.getByRole("button", { name: "自動 (¥)" })).toBeVisible();

  await page.evaluate(() => localStorage.removeItem("ludcount.locale"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(
    page.getByRole("button", { name: "米ドル ($)" }),
  ).toHaveAttribute("aria-pressed", "true");

  await clickVisible(page.getByRole("link", { name: "取引" }));
  await expect(page.getByText(/\$900.00/).first()).toBeVisible();
  await page.getByRole("button", { name: /削除/ }).click();
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await expect(page.getByText("表示する取引がありません。")).toBeVisible();

  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: `/tmp/ludcount-phase2-persisted-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
