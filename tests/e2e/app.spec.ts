import { test, expect } from "@playwright/test";

test.describe("core flows", () => {
  test("home loads with live match data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Worlds 2026", level: 1 })).toBeVisible();
    // live feed synced indicator
    await expect(page.getByText("Synced").first()).toBeVisible();
    // at least one match card linking to a match detail page
    const matchLinks = page.locator('a[href^="/matches/"]');
    await expect(matchLinks.first()).toBeVisible();
    expect(await matchLinks.count()).toBeGreaterThan(0);
  });

  test("match center lists series and opens a match detail", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const first = page.locator('a[href^="/matches/"]').first();
    await expect(first).toBeVisible();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/matches\/\d+/);
    await first.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, "\\/")));
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("standings page shows bracket and standings", async ({ page }) => {
    await page.goto("/standings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("teams index opens a team profile", async ({ page }) => {
    await page.goto("/teams");
    const first = page.locator('a[href^="/teams/"]').first();
    await expect(first).toBeVisible();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/teams\/[A-Z0-9]+/);
    await first.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, "\\/")));
    // team page heading shows the full team name
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
  });

  test("predictor records a pick and resets", async ({ page }) => {
    await page.goto("/predictor");
    // team pick buttons carry aria-pressed; the Swiss/Knockout tab buttons do too, exclude them
    const unpressed = page.locator('button[aria-pressed="false"]').filter({ hasNotText: /Swiss|Knockout/ });
    await expect(unpressed.first()).toBeVisible();
    // pin the team by its code - the state selector re-resolves to the next unpressed button after a click
    const team = (await unpressed.first().innerText()).split("\n").at(0)?.trim() ?? "";
    expect(team).not.toBe("");
    const teamBtn = page.locator("button").filter({ hasText: team }).first();
    await teamBtn.click();
    await expect(teamBtn).toHaveAttribute("aria-pressed", "true");
    // Reset asks for confirmation via a native dialog - accept it
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(teamBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("command search finds a team", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const input = page.locator("input").first();
    await expect(input).toBeVisible();
    await input.fill("T1");
    // a search result mentioning T1 appears in the palette
    await expect(page.getByText(/^T1$/).first()).toBeVisible();
  });
});
