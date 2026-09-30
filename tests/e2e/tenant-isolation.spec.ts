import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createOrder } from "@/features/orders/checkout";
import type { Order } from "@/features/orders/types";
import { apiRoutes } from "@/lib/query/keys";
import { signInAs, skipWelcome } from "@tests/support/e2e";
import {
  aCustomer,
  anOrder,
  registerBusiness,
  removeBusinesses,
  stockedProduct,
  type TestBusiness,
} from "@tests/support/integration";

/**
 * Tenant isolation, in the browser (AGENTS §7, §26): owner B, signed in, is
 * shown nothing of business A — not in B's lists, not at A's own addresses,
 * and not from the API those screens read.
 */
const CUSTOMER = "Meera Pillai";
let a: TestBusiness;
let b: TestBusiness;
let order: Order;
let customerId: string;

test.beforeAll(async () => {
  a = await registerBusiness("Business A");
  b = await registerBusiness("Business B");
  const product = await stockedProduct(a.tenant, { name: "Rose hamper", stock: 5 });
  const customer = await aCustomer(a.tenant, CUSTOMER);
  customerId = customer.id;
  order = await createOrder(
    a.tenant,
    anOrder({ customer: { kind: "CUSTOMER", id: customer.id }, items: [{ productId: product.id, quantity: 1 }] }),
    randomUUID(),
  );
});

test.afterAll(async () => {
  await removeBusinesses();
});

test("an owner sees nothing of another business", async ({ page }) => {
  await signInAs(page, b);
  await skipWelcome(page);

  await test.step("not in their own lists", async () => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(order.orderNumber)).toHaveCount(0);

    await page.goto("/customers");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(CUSTOMER)).toHaveCount(0);
  });

  await test.step("not at the other business's addresses", async () => {
    await page.goto(`/orders/${order.id}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(CUSTOMER)).toHaveCount(0);

    await page.goto(`/customers/${customerId}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(CUSTOMER)).toHaveCount(0);
  });

  await test.step("not from the API, with B's own session", async () => {
    for (const route of [
      apiRoutes.orders.detail(order.id),
      apiRoutes.orders.bill(order.id),
      apiRoutes.orders.billPdf(order.id),
      apiRoutes.customers.detail(customerId),
    ]) {
      const response = await page.request.get(route);
      expect(response.status(), route).toBe(404);
    }
    // A list is read under B's policies, so it comes back empty.
    const payments = await page.request.get(apiRoutes.orders.payments(order.id));
    expect(await payments.json()).toEqual({ success: true, data: [] });
  });
});
