import { expect, test } from "@playwright/test";

test("renders the Czech-first authentication flow without production access", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/sign-in");

  await expect(page).toHaveTitle("Ludcount");
  await expect(
    page.getByRole("heading", { name: "Domácí peníze jednoduše." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Přihlásit se" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await expect(
    page.getByRole("heading", { name: "Vytvořit účet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zpět k přihlášení" }).click();
  await expect(
    page.getByRole("heading", { name: "Přihlásit se" }),
  ).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.screenshot({
    path: `/tmp/ludcount-phase2-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
