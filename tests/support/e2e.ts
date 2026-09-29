import { expect, type Page } from "@playwright/test";

import { UI_TEXT } from "@/constants/messages";
import type { TestBusiness } from "@tests/support/integration";

/**
 * Steps the browser journeys share (tests/e2e, R6.5). An owner is made by
 * `registerBusiness` (tests/support/integration.ts) and signs in here, through
 * the sign-in screen, as they would.
 */
export async function signInAs(page: Page, owner: Pick<TestBusiness, "phone" | "password">) {
  await page.goto("/login");
  await page.getByLabel(UI_TEXT.auth.phoneLabel).fill(owner.phone);
  // The field's name, not Show password's.
  await page.getByLabel(new RegExp(`^${UI_TEXT.auth.passwordLabel}`)).fill(owner.password);
  await page.getByRole("button", { name: UI_TEXT.auth.signIn, exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * Waits for an action's outcome. A success with nothing to do next closes
 * itself and is read out by the page's status region (plan §139.6), which is
 * where a person using a screen reader hears it too.
 */
export async function expectOutcome(page: Page, title: string) {
  await expect(page.getByRole("status").filter({ hasText: title })).toBeAttached();
}
