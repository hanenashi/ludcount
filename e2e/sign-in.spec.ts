import { expect, test } from "@playwright/test";

test("renders invitation-only authentication and public demo entry", async ({
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
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).name).toBe("Ludcount");
  await expect(
    page.getByRole("heading", { name: "Domácí peníze jednoduše." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Přihlásit se" }),
  ).toBeVisible();
  await expect(
    page.getByText("Registrace je zatím pouze na pozvánku."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Požádat o přístup" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Vytvořit účet" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Vyzkoušet demo" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Zapomenuté heslo?" }).click();
  await expect(
    page.getByRole("heading", { name: "Obnovit heslo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zpět k přihlášení" }).click();

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
