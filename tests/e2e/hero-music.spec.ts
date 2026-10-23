import { test, expect } from "@playwright/test";

for (const width of [1280, 375, 320]) {
  test(`music stays inside the artwork at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    // The test checks our UI, not YouTube's external stream or bot challenges.
    await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({
      contentType: "text/html", body: '<body style="margin:0;background:#111;color:#eee">Official video area (test placeholder)</body>',
    }));
    await page.goto("/");
    const play = page.getByRole("button", { name: "Play K/DA FIRESTARTER", exact: true });
    await expect(play).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
    await page.waitForFunction(() => {
      const button = document.querySelector('button[aria-label="Play K/DA FIRESTARTER"]');
      return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
    });
    await play.click();
    const frame = page.locator('iframe[title="K/DA - FIRESTARTER (Official Music Video)"]');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute("src", /autoplay=1&playsinline=1/);
    await expect(frame).toHaveAttribute("allow", /autoplay/);
    const art = await frame.locator("../..").boundingBox();
    const video = await frame.boundingBox();
    expect(video!.width).toBeGreaterThanOrEqual(200);
    expect(video!.height).toBeGreaterThanOrEqual(200);
    expect(video!.x).toBeGreaterThanOrEqual(art!.x);
    expect(video!.y).toBeGreaterThanOrEqual(art!.y);
    expect(video!.x + video!.width).toBeLessThanOrEqual(art!.x + art!.width + 1);
    expect(video!.y + video!.height).toBeLessThanOrEqual(art!.y + art!.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ animations: "disabled", path: `test-results/worlds-inline-music-${width}.png` });
    await page.getByRole("button", { name: "Close music video" }).click();
    await expect(frame).toHaveCount(0);
    await expect(play).toBeFocused();
  });
}
