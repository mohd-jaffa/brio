import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { UI_TEXT } from "@/constants/messages";
import { orderStatusLabel } from "@/constants/statuses";
import { formatPaise } from "@/lib/format/currency";
import { formatQuantity, pluralUnit } from "@/lib/format/quantity";
import { expectOutcome, signInAs } from "@tests/support/e2e";
import { aMobileNumber, registerBusiness, removeBusinesses, type TestBusiness } from "@tests/support/integration";

/**
 * The critical journey (AGENTS §26, plan §121): an owner signs in, adds a
 * customer and a product, counts stock in, takes an order, opens its bill,
 * shares it and downloads it, and moves the order on to Completed — each
 * through the screens, as they would.
 */
const BUSINESS = "Journey Bakes";
let owner: TestBusiness;

test.beforeAll(async () => {
  owner = await registerBusiness(BUSINESS);
});

test.afterAll(async () => {
  await removeBusinesses();
});

test.beforeEach(async ({ context }) => {
  // A desktop browser with no share sheet, so Share takes its download path.
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { value: undefined });
    Object.defineProperty(Navigator.prototype, "canShare", { value: undefined });
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("an owner takes an order from sign-in to Completed", async ({ page }) => {
  const customer = "Anu Thomas";
  const product = "Plum cake";
  const unit = "piece";
  let orderNumber = "";
  // A product's row on Inventory, named by what it holds.
  const stockRow = (count: number) =>
    page.getByRole("button", { name: `${product} ${UI_TEXT.inventory.inStock(formatQuantity(count, unit))}` });

  await test.step("Login", async () => {
    await signInAs(page, owner);
  });

  await test.step("Customer", async () => {
    await page.goto("/customers");
    // The phone's floating button; the empty list offers the same.
    await page.getByRole("button", { name: UI_TEXT.customersScreen.newCustomer }).first().click();
    const sheet = page.getByRole("dialog", { name: UI_TEXT.customerForm.newTitle });
    await sheet.getByLabel(UI_TEXT.customerForm.name).fill(customer);
    await sheet.getByLabel(UI_TEXT.customerForm.phone).fill(aMobileNumber());
    await sheet.getByRole("button", { name: UI_TEXT.customerForm.save }).click();
    // A new customer opens on their own page.
    await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: customer })).toBeVisible();
  });

  await test.step("Product", async () => {
    await page.goto("/products");
    await page.getByRole("button", { name: UI_TEXT.products.add }).first().click();
    const sheet = page.getByRole("dialog", { name: UI_TEXT.products.form.newTitle });
    await sheet.getByLabel(UI_TEXT.products.form.name).fill(product);
    await sheet.getByLabel(UI_TEXT.products.form.price).fill("450");
    await sheet.getByRole("button", { name: UI_TEXT.products.form.save }).click();
    await expectOutcome(page, UI_TEXT.outcomes.productSaved);
    await expect(page.getByRole("button", { name: UI_TEXT.products.actions(product) })).toBeVisible();
  });

  await test.step("Stock", async () => {
    await page.goto("/inventory");
    await page.getByRole("button", { name: product }).click();
    await page.getByRole("button", { name: UI_TEXT.inventory.record }).click();
    const sheet = page.getByRole("dialog", { name: UI_TEXT.inventory.form.titleFor(product) });
    await sheet.getByLabel(UI_TEXT.inventory.form.quantityIn(pluralUnit(unit))).fill("12");
    await sheet.getByRole("button", { name: UI_TEXT.inventory.form.save }).click();
    await expectOutcome(page, UI_TEXT.outcomes.stockRecorded);
    // The history under the form takes the new stock once the form has gone.
    await expect(page.getByRole("dialog", { name: product, exact: true })).toContainText(formatQuantity(12, unit));
    await page.goto("/inventory");
    await expect(stockRow(12)).toBeVisible();
  });

  await test.step("Create Order", async () => {
    const text = UI_TEXT.newOrder;
    await page.goto("/orders/new");
    const add = page.getByRole("button", { name: text.add(product) });
    await add.click();
    await add.click();
    await page.getByRole("button", { name: text.continueToDetails }).click();

    await page.getByRole("button", { name: text.chooseCustomer }).click();
    const picker = page.getByRole("dialog", { name: UI_TEXT.customerPicker.title });
    await picker.getByRole("radio", { name: new RegExp(customer) }).click();
    await expect(picker).toBeHidden();

    await page.getByRole("button", { name: text.proceedToPayment }).click();
    await page.getByRole("radio", { name: text.paymentChoices.UNPAID }).check();
    await page.getByRole("button", { name: text.placeOrder }).click();

    const placed = page.getByRole("dialog", { name: text.placed });
    await expect(placed).toContainText(customer);
    orderNumber = /ORD-\d+/.exec((await placed.textContent()) ?? "")?.[0] ?? "";
    expect(orderNumber).not.toBe("");
  });

  await test.step("Bill", async () => {
    await page
      .getByRole("dialog", { name: UI_TEXT.newOrder.placed })
      .getByRole("button", { name: UI_TEXT.bill.view })
      .click();
    const bill = page.getByRole("dialog", { name: UI_TEXT.bill.title(orderNumber) });
    await expect(bill.getByText(BUSINESS)).toBeVisible();
    await expect(bill.getByText(customer)).toBeVisible();
    await expect(bill.getByText(product)).toBeVisible();
    await expect(bill.getByText(formatPaise(90_000)).first()).toBeVisible();
  });

  await test.step("Share/Download", async () => {
    const bill = page.getByRole("dialog", { name: UI_TEXT.bill.title(orderNumber) });

    const image = page.waitForEvent("download");
    await bill.getByRole("button", { name: UI_TEXT.bill.share }).click();
    expect((await image).suggestedFilename()).toMatch(/\.png$/);
    await expectOutcome(page, UI_TEXT.bill.saved);

    const pdf = page.waitForEvent("download");
    await bill.getByRole("button", { name: UI_TEXT.bill.downloadPdf }).click();
    const file = await pdf;
    expect(file.suggestedFilename()).toBe(`${orderNumber} - ${BUSINESS}.pdf`);
    expect((await readFile(await file.path())).subarray(0, 5).toString()).toBe("%PDF-");
    await expectOutcome(page, UI_TEXT.bill.pdfSaved);

    await bill.getByRole("button", { name: UI_TEXT.actions.close, exact: true }).click();
    await expect(bill).toBeHidden();
  });

  await test.step("Update Status", async () => {
    const text = UI_TEXT.orderDetail;
    const label = (status: "IN_PROGRESS" | "READY" | "DELIVERED") => orderStatusLabel(status, "PICKUP");

    await page.goto("/orders");
    await page.getByRole("link", { name: new RegExp(orderNumber) }).click();
    await expect(page.getByRole("heading", { level: 1, name: orderNumber })).toBeVisible();

    await page.getByRole("button", { name: text.moveTo(label("IN_PROGRESS")) }).click();
    await page.getByRole("button", { name: text.moveTo(label("READY")) }).click();
    await page.getByRole("button", { name: text.moveTo(label("DELIVERED")) }).click();

    // Completed can't be undone, so it asks first.
    const sure = page.getByRole("alertdialog", { name: text.finalTitle(orderNumber, label("DELIVERED")) });
    await sure.getByRole("button", { name: text.moveTo(label("DELIVERED")) }).click();
    await expect(page.getByText(label("DELIVERED")).first()).toBeVisible();
    await expect(page.getByRole("button", { name: text.moreMoves })).toBeHidden();

    // The two sold came off the shelf.
    await page.goto("/inventory");
    await expect(stockRow(10)).toBeVisible();
  });
});
