import { describe, expect, it } from "vitest";

import { adminListQuerySchema } from "@/lib/validation/schemas/admin";

describe("the developer console's list query", () => {
  it("takes where a page starts, as digits", () => {
    expect(adminListQuerySchema.parse({ cursor: "20" })).toEqual({ cursor: 20 });
    expect(adminListQuerySchema.parse({})).toEqual({});
    expect(adminListQuerySchema.safeParse({ cursor: "twenty" }).success).toBe(false);
  });
});
