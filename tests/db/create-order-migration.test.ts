import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isErrorMessageCode } from "@/constants/messages";
import { MANUAL_INVENTORY_TYPES } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0015_create_order.sql"), "utf8");
const seed = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

/**
 * The contract of 0015 (§133.3 C1, C2, C4; BUG-08, BUG-09, BUG-02, BUG-06).
 * Proved on the local database as well, signed in as the owner: a Guest order
 * with a custom line and a part payment was stored as ORD-1001, Part paid,
 * with stock reserved for the catalogue line only; its key sent again returned
 * it and made nothing; four of a cheesecake with three left was refused with
 * what was left; totals that did not add up were refused; a payment past the
 * balance was refused and one that settled it made the order Paid; another
 * business's counter could not be reached; a product never stocked was sold.
 */
describe("create order migration", () => {
  describe("order numbers (BUG-08)", () => {
    it("keeps a counter on each business, from 1001", () => {
      expect(migration).toMatch(/add column next_order_number integer not null default 1001/);
    });

    it("numbers every inserted order from it, as ORD-n, and refuses another business's counter", () => {
      expect(migration).toMatch(/before insert on public\.orders\s+for each row\s+execute function public\.assign_order_number\(\)/);
      expect(migration).toMatch(/new\.order_number := 'ORD-' \|\| number;/);
      expect(migration).toMatch(/new\.bakery_id is distinct from public\.current_profile_bakery_id\(\)/);
    });

    it("leaves the number to the counter when an order is placed, and in the seed", () => {
      const insert = migration.slice(migration.indexOf("insert into public.orders ("));
      expect(insert.slice(0, insert.indexOf(")"))).not.toMatch(/order_number/);
      expect(seed).not.toMatch(/'#100\d'/);
    });
  });

  describe("idempotency (§133.3 C2)", () => {
    it("keeps one key per business on orders and on payments", () => {
      expect(migration).toMatch(/constraint orders_bakery_idempotency_key unique \(bakery_id, idempotency_key\)/);
      expect(migration).toMatch(/constraint payments_bakery_idempotency_key unique \(bakery_id, idempotency_key\)/);
    });

    it("returns the order a key already made, after waiting for any call still making it", () => {
      expect(migration).toMatch(/pg_advisory_xact_lock\(hashtextextended\(business::text \|\| ':' \|\| p_idempotency_key::text, 0\)\)/);
      expect(migration).toMatch(/if found then\s+return query select new_order, false;/);
    });
  });

  describe("the oversell guard (§133.3 C4)", () => {
    it("locks the products, in one order, before reading their stock", () => {
      const lock = migration.indexOf("for no key update;\n\n  select jsonb_agg");
      expect(lock).toBeGreaterThan(0);
      expect(migration.slice(0, lock)).toMatch(/order by p\.id\s+$/);
    });

    it("counts a product as stocked once its stock was recorded by hand — anything but an order", () => {
      const stocked = migration.match(/t\.type in \(([^)]*)\)\) as stocked/);
      expect(stocked![1].split(",").map((type) => type.trim().replace(/'/g, ""))).toEqual([...MANUAL_INVENTORY_TYPES]);
    });

    it("refuses a shortfall with what is left", () => {
      expect(migration).toMatch(/hint = 'ORDER_INSUFFICIENT_STOCK',\s+detail = jsonb_build_object\('shortfalls', shortfalls\)::text;/);
    });

    it("reserves stock for catalogue lines only", () => {
      expect(migration).toMatch(/'ORDER_RESERVATION', -\(line ->> 'quantity'\)::integer, 'ORDER', new_order::text\s+from jsonb_array_elements\(lines\) as line\s+where line ->> 'product_id' is not null;/);
    });
  });

  describe("payments decide the payment status (BUG-02, BUG-06)", () => {
    it("refuses a payment past the order's total, with the order locked", () => {
      expect(migration).toMatch(/for no key update;[\s\S]*already_paid \+ new\.amount > order_total[\s\S]*hint = 'PAYMENT_EXCEEDS_BALANCE'/);
    });

    it("derives the status from the payments on every change", () => {
      expect(migration).toMatch(/after insert or update or delete on public\.payments/);
      expect(migration).toMatch(/when coalesce\(sum\(p\.amount\), 0\) >= o2\.total then 'PAID'/);
    });

    it("records the payment taken with the order in the same transaction", () => {
      expect(migration).toMatch(/if payment is not null then\s+insert into public\.payments/);
    });
  });

  it("stores only an order whose totals add up", () => {
    expect(migration).toMatch(/raise exception 'order totals do not add up'/);
  });

  it("raises only codes the app has words for", () => {
    for (const [, hint] of migration.matchAll(/hint = '([A-Z_]+)'/g)) expect(isErrorMessageCode(hint)).toBe(true);
  });

  it("runs create_order as the caller, so row-level security applies, and for signed-in users only", () => {
    expect(migration).toMatch(/function public\.create_order\(p_order jsonb, p_idempotency_key uuid\)[\s\S]*?security invoker/);
    expect(migration).toMatch(/revoke all on function public\.create_order\(jsonb, uuid\) from public, anon;/);
    expect(migration).toMatch(/grant execute on function public\.create_order\(jsonb, uuid\) to authenticated;/);
  });
});
