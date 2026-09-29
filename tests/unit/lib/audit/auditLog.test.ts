import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => ({ from }) }));
const error = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: (...args: unknown[]) => error(...args) },
}));

import { logActionSafe } from "@/lib/audit/auditLog";
import { tenantOf } from "@tests/support/tenant";

beforeEach(() => {
  vi.clearAllMocks();
  insert.mockResolvedValue({ error: null });
});

const entry = {
  action: "UPDATE" as const,
  entity_type: "customers",
  entity_id: "c-1",
  previous_data: { name: "A" },
  new_data: { name: "B" },
};

describe("logActionSafe", () => {
  it("writes through the server's own client, never the caller's (BUG-20)", async () => {
    const callersClient = { from: vi.fn() };
    await logActionSafe(tenantOf(callersClient), entry);

    expect(from).toHaveBeenCalledWith("audit_logs");
    expect(callersClient.from).not.toHaveBeenCalled();
  });

  it("records who acted and for which business, from the tenant (§133.7 G1)", async () => {
    await logActionSafe(tenantOf({}, { bakeryId: "b-9", actorId: "u-7" }), entry);
    expect(insert).toHaveBeenCalledWith({ ...entry, bakery_id: "b-9", user_id: "u-7" });
  });

  it("lets nothing in the entry claim another business or another user", async () => {
    const forged = { ...entry, bakery_id: "someone-else", user_id: "someone-else" } as typeof entry;
    await logActionSafe(tenantOf({}, { bakeryId: "b-1", actorId: "u-1" }), forged);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ bakery_id: "b-1", user_id: "u-1" }));
  });

  it("logs a failed write and carries on, since the change it describes has happened", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    await expect(logActionSafe(tenantOf({}), entry)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("Failed to write audit log", {
      bakeryId: "b-1",
      action: "UPDATE",
      entityType: "customers",
      entityId: "c-1",
      code: "42501",
    });
  });
});
