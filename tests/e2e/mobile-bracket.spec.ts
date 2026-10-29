import { test, expect } from "@playwright/test";

test("mobile Swiss has compact round lists and an optional full bracket", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/standings");
  await page.getByRole("button", { name: "Swiss", exact: true }).click();
  const picker = page.getByRole("group", { name: /Swiss round|Pilih ronde Swiss/ });
  await expect(picker).toBeVisible();
  for (let round = 1; round <= 5; round++) {
    await picker.getByRole("button", { name: new RegExp(`(Round|Ronde) ${round}`) }).click();
    await expect(page.locator('[aria-label="Swiss bracket"] .eyebrow').filter({ visible: true })).toHaveCount(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /Lihat bracket lengkap|View full bracket ↔/ }).click();
  await expect(page.getByRole("region", { name: "Swiss full bracket", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Kembali ke daftar pertandingan|Back to match list/ }).click();
  await expect(page.getByRole("region", { name: "Swiss bracket", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(picker).toBeHidden();
  await expect(page.locator('[aria-label="Swiss bracket"] .eyebrow').filter({ visible: true })).toHaveCount(5);
});
