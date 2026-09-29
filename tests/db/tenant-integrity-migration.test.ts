import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0005_tenant_integrity.sql"), "utf8");

/**
 * The contract of 0005 (plan §139.12). Each rule was also proved against the
 * local database when it was written — every cross-business reference refused
 * with 23503, a zero or unknown-method payment with 23514, and a deactivated
 * profile reading no payments, audit rows or notifications (changelog,
 * 2026-09-24, R0.11 – R0.13).
 */
describe("tenant integrity migration", () => {
  it("makes every cross-row reference carry its business (BUG-19)", () => {
    expect(migration).toMatch(/foreign key \(bakery_id, customer_id\) references public\.customers \(bakery_id, id\)/i);
    expect(migration).toMatch(/foreign key \(bakery_id, order_id\) references public\.orders \(bakery_id, id\)/i);
    expect(migration).toMatch(/foreign key \(bakery_id, product_id\) references public\.products \(bakery_id, id\)/i);
    expect(migration).toMatch(
      /foreign key \(bakery_id, category_id\) references public\.categories \(bakery_id, id\)/i,
    );
  });

  it("clears only the category when one is deleted, never the product's business", () => {
    expect(migration).toMatch(/on delete set null \(category_id\)/i);
  });

  it("replaces the single-column references it supersedes", () => {
    for (const old of [
      "orders_customer_id_fkey",
      "payments_order_id_fkey",
      "inventory_transactions_product_id_fkey",
      "products_category_id_fkey",
    ]) {
      expect(migration).toContain(`drop constraint ${old}`);
    }
  });

  it("puts payments, audit logs and notifications behind the shared tenant check (BUG-18)", () => {
    for (const table of ["payments", "audit_logs", "notifications"]) {
      const policies = migration.match(new RegExp(`create policy \\w+\\s+on public\\.${table}[\\s\\S]*?;`, "gi")) ?? [];
      expect(policies.length).toBeGreaterThan(0);
      for (const policy of policies) {
        expect(policy).toMatch(/to authenticated/);
        expect(policy).toMatch(/current_profile_bakery_id\(\)/);
      }
    }
  });

  it("keeps a payment positive and its method known (BUG-21)", () => {
    expect(migration).toMatch(/check \(amount > 0\)/);
    expect(migration).toMatch(/payment_method in \('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'\)/);
  });
});
