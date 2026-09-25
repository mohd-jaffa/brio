import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ORDER_STATUSES } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0013_status_ready.sql"), "utf8");

/** The contract of 0013 (plan §139.11.8, Q3): an order can be Ready. */
describe("status ready migration", () => {
  it("lets an order's status be exactly the statuses the app knows", () => {
    const check = migration.match(/check \(status in \(([^)]*)\)\)/);
    expect(check).not.toBeNull();
    const stored = check![1].split(",").map((value) => value.trim().replace(/'/g, ""));
    expect(stored).toEqual([...ORDER_STATUSES]);
  });

  it("replaces the old check rather than adding a second one", () => {
    expect(migration).toMatch(/drop constraint orders_status_check;/);
  });
});
