import { randomInt, randomUUID } from "node:crypto";

import { login, register } from "@/features/auth/api";
import { createCustomer } from "@/features/customers/api";
import { getInventoryBalances, logInventoryTransaction } from "@/features/inventory/api";
import { createProduct } from "@/features/products/api";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";
import {
  createCustomerSchema,
  createOrderSchema,
  createProductSchema,
  logInventoryTransactionSchema,
  loginSchema,
  registerSchema,
  type CreateOrderInput,
} from "@/lib/validation";

/**
 * Accounts for the integration tests (tests/db/integration, R6.6): each made
 * as the app registers one, signed in as the app signs in, and deleted after
 * with everything it owns (`delete_account`, 0030).
 */
export interface TestBusiness {
  /** Acts as the signed-in owner, under their RLS policies, as a route would. */
  tenant: Tenant;
  userId: string;
  bakeryId: string;
  /** The ten digits, as typed at sign-in. */
  phone: string;
  email: string;
  password: string;
}

const made: string[] = [];

/** Ten digits a mobile number may have, unlikely to be anyone's account. */
export const aMobileNumber = () => `9${randomInt(100_000_000, 1_000_000_000)}`;

export const anEmail = () => `it-${randomUUID().slice(0, 12)}@brio.test`;

export function registration(overrides: Record<string, string> = {}) {
  const password = `Test-${randomUUID()}`;
  return registerSchema.parse({
    name: "Test Owner",
    phone: aMobileNumber(),
    email: anEmail(),
    password,
    confirmPassword: password,
    businessName: "Test Bakes",
    city: "Kochi",
    address: "1 Test Street",
    ...overrides,
  });
}

/** Registers a business, as `POST /api/auth/register` does, and signs its owner in. */
export async function registerBusiness(businessName = "Test Bakes"): Promise<TestBusiness> {
  const phone = aMobileNumber();
  const details = registration({ phone, businessName });
  const { userId, bakeryId } = await register(createSupabaseServiceRoleClient(), details);
  deleteAfter(userId);
  return {
    tenant: await signIn(phone, details.password, bakeryId),
    userId,
    bakeryId,
    phone,
    email: details.email,
    password: details.password,
  };
}

/** Signs in as `POST /api/auth/login` does, and acts as that owner. */
export async function signIn(phone: string, password: string, bakeryId: string): Promise<Tenant> {
  const session = await login(createSupabaseAnonClient(), loginSchema.parse({ phone, password }));
  return {
    supabase: createSupabaseAnonClient(session.accessToken),
    bakeryId,
    actorId: session.profile.id,
  };
}

/** Remembers an account, so `removeBusinesses` deletes it with the rest. */
export function deleteAfter(userId: string) {
  made.push(userId);
}

/** Deletes every account these tests made, and all it owns. */
export async function removeBusinesses(): Promise<void> {
  const admin = createSupabaseServiceRoleClient();
  for (const userId of made.splice(0)) {
    const { error } = await admin.rpc("delete_account", { p_user_id: userId });
    if (error) throw new Error(`Could not remove the test account ${userId}: ${error.message}`);
  }
}

/** A product on sale at `price` paise, with `stock` counted in (a STOCK_IN line), as the screens make one. */
export async function stockedProduct(tenant: Tenant, { price = 25_000, stock = 10, name = "Plum cake" } = {}) {
  const product = await createProduct(tenant, createProductSchema.parse({ name, defaultPrice: price }));
  if (stock > 0) {
    await logInventoryTransaction(
      tenant,
      logInventoryTransactionSchema.parse({ productId: product.id, type: "STOCK_IN", quantity: stock }),
    );
  }
  return product;
}

/** A saved customer of this business. */
export function aCustomer(tenant: Tenant, name = "Priya Menon") {
  return createCustomer(tenant, createCustomerSchema.parse({ name, phone: aMobileNumber(), address: "2 Market Road" }));
}

/** What is in stock of one product now (`stock_levels`). */
export async function stockOf(tenant: Tenant, productId: string): Promise<number> {
  const [level] = await getInventoryBalances(tenant, [productId]);
  return level?.balance ?? 0;
}

/** Tomorrow at this hour, as the order screen sends a date. */
export const tomorrow = () => new Date(Date.now() + 24 * 60 * 60_000).toISOString();

/** An order as `POST /api/orders` takes it: a pickup tomorrow, unpaid, unless told otherwise. */
export function anOrder(overrides: Partial<CreateOrderInput> = {}) {
  return createOrderSchema.parse({
    customer: { kind: "GUEST" },
    items: [],
    delivery: { type: "PICKUP", date: tomorrow() },
    payment: { status: "UNPAID" },
    ...overrides,
  });
}
