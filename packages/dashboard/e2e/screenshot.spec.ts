import { test } from "@playwright/test";

// Captures the README hero screenshot. Run with: pnpm exec playwright test screenshot
test("capture homepage screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "../../docs/screenshot.png", fullPage: true });
});
