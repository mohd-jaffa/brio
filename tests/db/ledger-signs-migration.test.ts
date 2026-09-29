import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { INVENTORY_TRANSACTION_TYPES, STOCK_DECREASING_TYPES, STOCK_INCREASING_TYPES } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0033_ledger_signs.sql"), "utf8");

const listed = (sign: string) =>
  migration
    .match(new RegExp(`when type in \\(([^)]*)\\) then quantity ${sign} 0`))?.[1]
    .split(",")
    .map((value) => value.trim().replace(/'/g, ""));

/**
 * The contract of 0033 (R6.6): the database's sign rule is the app's
 * (`signIsRight`). Proved on the local database by the integration tests.
 */
describe("ledger signs migration", () => {
  it("adds and takes away for the same kinds the app does", () => {
    expect(listed(">")).toEqual([...STOCK_INCREASING_TYPES]);
    expect(listed("<")).toEqual([...STOCK_DECREASING_TYPES]);
  });

  it("lets every other kind go either way, but never nowhere", () => {
    const others = INVENTORY_TRANSACTION_TYPES.filter(
      (type) => !([...STOCK_INCREASING_TYPES, ...STOCK_DECREASING_TYPES] as string[]).includes(type),
    );
    expect(others).toEqual(["ORDER_RESERVATION", "ADJUSTMENT"]);
    expect(migration).toContain("else quantity <> 0");
  });

  it("checks every new line, and leaves the lines already written", () => {
    expect(migration).toMatch(/add constraint inventory_transactions_sign_check check \(/);
    expect(migration).toContain(") not valid;");
  });
});
