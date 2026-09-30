import { expect, test } from "@playwright/test";

import { UI_TEXT } from "@/constants/messages";

/**
 * The landing page (plan §139.11.22), for someone who has never signed in:
 * it opens without a session, shows the app on its own screens, and leads to
 * making an account; the sign-in screen leads to it.
 */
const text = UI_TEXT.landing;

test("a visitor meets Brio on the landing page, and goes on to make an account", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: UI_TEXT.auth.seeWhatBrioDoes }).click();
  await expect(page).toHaveURL(/\/about$/);

  await expect(page.getByRole("heading", { level: 1, name: UI_TEXT.appTagline })).toBeVisible();
  for (const feature of Object.values(text.features)) {
    await expect(page.getByRole("heading", { level: 3, name: feature.title })).toBeVisible();
  }
  // The day's phone opens on taking an order, its screen loaded; the bill comes up as its step does.
  const order = page.getByRole("img", { name: text.shots.order });
  await order.scrollIntoViewIfNeeded();
  await expect(order).toHaveJSProperty("complete", true);
  expect(await order.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("heading", { level: 3, name: text.features.bill.title }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("img", { name: text.shots.bill })).toBeVisible();

  await page.getByRole("link", { name: text.start }).first().click();
  await expect(page).toHaveURL(/\/register$/);
});
