import { expect, test, type Page } from "@playwright/test";
import { clickVisible, fillAmount } from "./helpers";

function isFirebaseRequest(urlValue: string) {
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

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("uses Japanese and manages custom demo categories locally", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const firebaseRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    if (isFirebaseRequest(request.url())) firebaseRequests.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/demo/settings");
  await page.getByRole("button", { name: "Japonština" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  await expect(page.getByRole("button", { name: "自動 (¥)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("link", { name: "カテゴリを管理" }).click();
  await expect(page).toHaveURL(/\/demo\/settings\/categories$/);
  await page.getByLabel("カテゴリ名").fill("ペット");
  await page.getByRole("button", { name: "カテゴリを作成" }).click();
  await expect(
    page.getByRole("listitem").getByRole("textbox", {
      name: "カテゴリ名",
    }),
  ).toHaveValue("ペット");
  await expectNoOverflow(page);

  await clickVisible(page.getByRole("link", { name: "取引" }));
  await clickVisible(page.getByRole("link", { name: "取引を追加" }));
  await fillAmount(page, "123.45", {
    amount: "金額",
    pad: "金額の数字キーパッド",
    decimal: "小数点",
    backspace: "最後の数字を削除",
    done: "完了",
  });
  await page.getByLabel("カテゴリ").selectOption({ label: "ペット" });
  await page.getByLabel("メモ").fill("猫のごはん");
  await page.getByRole("button", { name: "支出を保存" }).click();
  await expect(page.getByText("猫のごはん")).toBeVisible();

  const filterSummary = page.locator(".transaction-filters summary");
  await filterSummary.focus();
  await filterSummary.press("Enter");
  await page.getByLabel("カテゴリ").selectOption({ label: "ペット" });
  await expect(page.getByText("結果: 1")).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "設定" }));
  await page.getByRole("link", { name: "カテゴリを管理" }).click();
  const categoryRow = page.locator(".custom-category-row").filter({
    has: page.getByRole("textbox", { name: "カテゴリ名" }),
  });
  await categoryRow.getByRole("button", { name: "アーカイブ" }).click();
  await expect(categoryRow.getByText("アーカイブ済み")).toBeVisible();

  await clickVisible(page.getByRole("link", { name: "取引" }));
  await expect(
    page.locator(".transaction-row").getByText("ペット"),
  ).toBeVisible();
  await clickVisible(page.getByRole("link", { name: "取引を追加" }));
  await expect(
    page.getByLabel("カテゴリ").getByRole("option", { name: "ペット" }),
  ).toHaveCount(0);

  await page.reload();
  await clickVisible(page.getByRole("link", { name: "設定" }));
  await page.getByRole("link", { name: "カテゴリを管理" }).click();
  await expect(
    page.getByText("カスタムカテゴリはまだありません。"),
  ).toBeVisible();
  await expectNoOverflow(page);
  expect(firebaseRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  await page.screenshot({
    path: `/tmp/ludcount-japanese-categories-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
