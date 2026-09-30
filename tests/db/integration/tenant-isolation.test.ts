import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getCustomerById, listCustomers, updateCustomer } from "@/features/customers/api";
import { getProductById } from "@/features/products/api";
import { createOrder } from "@/features/orders/checkout";
import { captureError } from "@/lib/audit/errorLog";
import { getOrderById } from "@/features/orders/queries";
import { updateOrderStatus } from "@/features/orders/status";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { customerListQuerySchema, updateCustomerSchema, updateOrderStatusSchema } from "@/lib/validation";
import type { Customer } from "@/features/customers/types";
import type { Order } from "@/features/orders/types";
import type { Product } from "@/features/products/types";
import {
  aCustomer,
  anOrder,
  registerBusiness,
  removeBusinesses,
  stockedProduct,
  stockOf,
  type TestBusiness,
} from "@tests/support/integration";

/**
 * Baker A's business is never Baker B's (AGENTS §7; plan §121 "RLS"). B is
 * signed in and acts through the app's own data functions, then straight at
 * the database's API, as anyone holding B's token could: A's rows are not
 * there to read, change, move or borrow.
 */
let a: TestBusiness;
let b: TestBusiness;
let customer: Customer;
let product: Product;
let order: Order;

beforeAll(async () => {
  [a, b] = await Promise.all([registerBusiness("Baker A"), registerBusiness("Baker B")]);
  customer = await aCustomer(a.tenant);
  product = await stockedProduct(a.tenant, { stock: 5 });
  order = await createOrder(
    a.tenant,
    anOrder({ customer: { kind: "CUSTOMER", id: customer.id }, items: [{ productId: product.id, quantity: 1 }] }),
    randomUUID(),
  );
});

afterAll(removeBusinesses);

describe("through the app's data functions, as B", () => {
  it("finds none of A's customers, products or orders", async () => {
    const page = await listCustomers(b.tenant, customerListQuerySchema.parse({}));
    expect(page.items.map((row) => row.id)).not.toContain(customer.id);
    await expect(getCustomerById(b.tenant, customer.id)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    await expect(getProductById(b.tenant, product.id)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    await expect(getOrderById(b.tenant, order.id)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    expect(await stockOf(b.tenant, product.id)).toBe(0);
  });

  it("changes nothing of A's: not a customer, not an order's status", async () => {
    await expect(
      updateCustomer(b.tenant, customer.id, updateCustomerSchema.parse({ name: "Taken over" })),
    ).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    await expect(
      updateOrderStatus(b.tenant, order.id, updateOrderStatusSchema.parse({ status: "CANCELLED" })),
    ).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });

    expect((await getCustomerById(a.tenant, customer.id)).name).toBe(customer.name);
    expect((await getOrderById(a.tenant, order.id)).status).toBe("PENDING");
    expect(await stockOf(a.tenant, product.id)).toBe(4);
  });

  it("cannot sell A's product on B's order", async () => {
    await expect(
      createOrder(b.tenant, anOrder({ items: [{ productId: product.id, quantity: 1 }] }), randomUUID()),
    ).rejects.toMatchObject({ code: "ORDER_PRODUCT_UNAVAILABLE" });
    expect(await stockOf(a.tenant, product.id)).toBe(4);
  });
});

describe("straight at the database's API, with B's token", () => {
  it("reads none of A's rows, in any table that belongs to a business", async () => {
    for (const table of [
      "customers",
      "products",
      "orders",
      "order_items",
      "inventory_transactions",
      "payments",
      "expenses",
      "notifications",
      "audit_logs",
    ]) {
      const { data, error } = await b.tenant.supabase.from(table).select("*").eq("bakery_id", a.bakeryId);
      // order_items carry no bakery_id: a missing column is as good as nothing.
      if (error) expect(error.code, table).toBe("42703");
      else expect(data, table).toEqual([]);
    }
    const { data: items } = await b.tenant.supabase.from("order_items").select("id").eq("order_id", order.id);
    expect(items).toEqual([]);
  });

  it("writes nothing into A's business", async () => {
    const { error: insert } = await b.tenant.supabase
      .from("customers")
      .insert({ bakery_id: a.bakeryId, name: "Planted", phone: "+919000000000" });
    expect(insert?.code).toBe("42501");

    const { data: updated } = await b.tenant.supabase
      .from("orders")
      .update({ notes: "moved" })
      .eq("id", order.id)
      .select("id");
    expect(updated ?? []).toEqual([]);

    const { error: moved } = await b.tenant.supabase.rpc("change_order_status", {
      p_order_id: order.id,
      p_from: "PENDING",
      p_to: "CANCELLED",
    });
    expect(moved?.hint).toBe("RECORD_NOT_FOUND");
  });

  it("neither reads nor adds to the job queue, or the browsers kept for pushes", async () => {
    const { data: jobs } = await b.tenant.supabase.from("jobs").select("id");
    expect(jobs ?? []).toEqual([]);
    const { error: queued } = await b.tenant.supabase
      .from("jobs")
      .insert({ type: "SEND_PUSH_NOTIFICATION", payload: { bakeryId: a.bakeryId } });
    expect(queued?.code).toBe("42501");

    const { error: devices } = await b.tenant.supabase.from("device_tokens").select("id");
    expect(devices?.code).toBe("42501");
  });

  it("reads no error log, not even its own business's, and writes none (0036)", async () => {
    await captureError({ message: "Isolation check", bakeryId: b.bakeryId, userId: b.userId });
    for (const owner of [a, b]) {
      const { error: read } = await owner.tenant.supabase.from("error_logs").select("id");
      expect(read?.code).toBe("42501");
    }
    const { error: written } = await b.tenant.supabase
      .from("error_logs")
      .insert({ source: "SERVER", message: "Planted", bakery_id: a.bakeryId });
    expect(written?.code).toBe("42501");
  });

  it("shows a visitor with no session nothing at all", async () => {
    const visitor = createSupabaseAnonClient();
    for (const table of ["bakeries", "profiles", "customers", "orders"]) {
      const { data, error } = await visitor.from(table).select("id");
      expect(error?.code === "42501" || (data ?? []).length === 0, table).toBe(true);
    }
  });
});
