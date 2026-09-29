import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessRow } from "@/features/business/types";

const logActionSafe = vi.fn();
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: (...args: unknown[]) => logActionSafe(...args) }));
const warn = vi.fn();
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: (...args: unknown[]) => warn(...args), error: vi.fn() } }));

import { getBusiness, readLogo, removeBusinessFiles, replaceLogo, toBusinessProfile, updateBusiness } from "@/features/business/api";
import { tenantOf } from "@tests/support/tenant";

const BAKERY = "b1c2d3e4-f5a6-4890-abcd-ef1234567890";
const OLD_LOGO = `bakeries/${BAKERY}/logo/11111111-1111-4111-8111-111111111111`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function row(overrides: Partial<BusinessRow> = {}): BusinessRow {
  return {
    id: BAKERY,
    business_name: "Sweet Delights",
    tagline: null,
    city: "Pune",
    address: "12 MG Road",
    phone: "+919876543210",
    logo_path: null,
    logo_mime_type: null,
    name_changed_at: null,
    ...overrides,
  };
}

type Result = { data: unknown; error: unknown };
const ok = (data: unknown): Result => ({ data, error: null });
const failed = (error: unknown): Result => ({ data: null, error });

/**
 * Just enough of supabase-js for the business: reading `bakeries`, the two
 * functions, and the logo bucket. Every call is recorded in order, so a test
 * can see what reached the database and storage, and when.
 */
function fakeClient({
  rows = [row()],
  rpc = {} as Record<string, Result>,
  upload = ok({ path: "x" }),
  remove = ok([]),
  download = ok(new Blob([PNG], { type: "image/png" })),
}: {
  rows?: BusinessRow[];
  rpc?: Record<string, Result>;
  upload?: Result;
  remove?: Result;
  download?: Result;
} = {}) {
  const calls: Array<[string, ...unknown[]]> = [];
  let read = 0;
  const single = (result: () => Result) => ({ maybeSingle: () => Promise.resolve(result()) });

  const client = {
    from(table: string) {
      return {
        select: (columns: string) => ({
          eq: (column: string, value: string) => {
            calls.push(["select", table, column, value, columns]);
            return single(() => ok(rows[Math.min(read++, rows.length - 1)] ?? null));
          },
        }),
      };
    },
    rpc(name: string, args: Record<string, unknown>) {
      calls.push(["rpc", name, args]);
      const result = rpc[name] ?? ok(null);
      return Object.assign(Promise.resolve(result), {
        select: () => single(() => result),
      });
    },
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, _file: Uint8Array, options: unknown) => {
          calls.push(["upload", bucket, path, options]);
          return Promise.resolve(upload);
        },
        remove: (paths: string[]) => {
          calls.push(["remove", bucket, ...paths]);
          return Promise.resolve(remove);
        },
        download: (path: string) => {
          calls.push(["download", bucket, path]);
          return Promise.resolve(download);
        },
      }),
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const uploadedPath = (calls: Array<[string, ...unknown[]]>) => calls.find(([kind]) => kind === "upload")?.[2] as string;

beforeEach(() => {
  logActionSafe.mockReset();
  warn.mockReset();
});

describe("toBusinessProfile", () => {
  it("names the logo by an address on this app with its version, never by its storage path", () => {
    const profile = toBusinessProfile(row({ logo_path: OLD_LOGO, logo_mime_type: "image/png" }));
    expect(profile.logoUrl).toBe("/api/business/logo?v=11111111-1111-4111-8111-111111111111");
    expect(JSON.stringify(profile)).not.toContain("bakeries/");
    expect(toBusinessProfile(row()).logoUrl).toBeNull();
  });
});

describe("getBusiness", () => {
  it("reads the caller's own business", async () => {
    const { client, calls } = fakeClient();
    await expect(getBusiness(tenantOf(client, { bakeryId: BAKERY }))).resolves.toMatchObject({ id: BAKERY, name: "Sweet Delights", city: "Pune" });
    expect(calls[0]).toEqual(["select", "bakeries", "id", BAKERY, expect.stringContaining("logo_path")]);
  });

  it("reads a business RLS hides as not found", async () => {
    const { client } = fakeClient({ rows: [] });
    await expect(getBusiness(tenantOf(client, { bakeryId: BAKERY }))).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
  });
});

describe("updateBusiness", () => {
  const input = { name: "Sweet Delights", tagline: "Baked fresh", city: "Pune", address: "12 MG Road", phone: "+919876543210" };

  it("writes through the owner-only function, and audits the row before and after", async () => {
    const after = row({ tagline: "Baked fresh" });
    const { client, calls } = fakeClient({ rpc: { update_business_profile: ok(after) } });

    await expect(updateBusiness(tenantOf(client, { bakeryId: BAKERY }), input)).resolves.toMatchObject({ tagline: "Baked fresh" });
    expect(calls).toContainEqual([
      "rpc",
      "update_business_profile",
      { p_business_name: "Sweet Delights", p_tagline: "Baked fresh", p_city: "Pune", p_address: "12 MG Road", p_phone: "+919876543210" },
    ]);
    expect(logActionSafe).toHaveBeenCalledWith(tenantOf(client, { bakeryId: BAKERY }), expect.objectContaining({
      action: "UPDATE",
      entity_id: BAKERY,
      entity_type: "bakeries",
      previous_data: row(),
      new_data: after,
    }));
  });

  it("passes the database's refusal on in the app's words, and audits nothing", async () => {
    const { client } = fakeClient({
      rpc: { update_business_profile: failed({ code: "P0001", hint: "RECORD_NOT_FOUND", message: "no business for this caller" }) },
    });
    await expect(updateBusiness(tenantOf(client, { bakeryId: BAKERY }), input)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});

describe("replaceLogo", () => {
  it("refuses a file that is not an image before anything is stored", async () => {
    const { client, calls } = fakeClient();
    await expect(replaceLogo(tenantOf(client, { bakeryId: BAKERY }), new TextEncoder().encode("<script>"))).rejects.toMatchObject({
      code: "LOGO_TYPE_NOT_ALLOWED",
      httpStatus: 400,
    });
    expect(calls).toEqual([]);
  });

  it("stores the new file, points the business at it, then deletes the old one — in that order", async () => {
    const { client, calls } = fakeClient({
      rows: [row({ logo_path: `bakeries/${BAKERY}/logo/22222222-2222-4222-8222-222222222222`, logo_mime_type: "image/png" })],
      rpc: { set_business_logo: ok(OLD_LOGO) },
    });

    const profile = await replaceLogo(tenantOf(client, { bakeryId: BAKERY }), PNG);
    const stored = uploadedPath(calls);

    expect(stored).toMatch(new RegExp(`^bakeries/${BAKERY}/logo/[0-9a-f-]{36}$`));
    expect(calls.map(([kind]) => kind)).toEqual(["upload", "rpc", "remove", "select"]);
    expect(calls[0]).toEqual(["upload", "business-logos", stored, { contentType: "image/png", upsert: false }]);
    expect(calls[1]).toEqual(["rpc", "set_business_logo", { p_path: stored, p_mime_type: "image/png" }]);
    expect(calls[2]).toEqual(["remove", "business-logos", OLD_LOGO]);
    expect(profile.logoUrl).toMatch(/^\/api\/business\/logo\?v=/);
    expect(logActionSafe).toHaveBeenCalledWith(tenantOf(client, { bakeryId: BAKERY }), expect.objectContaining({
      previous_data: { logo_path: OLD_LOGO },
      new_data: { logo_path: stored, logo_mime_type: "image/png" },
    }));
  });

  it("deletes nothing when there was no logo before", async () => {
    const { client, calls } = fakeClient({ rpc: { set_business_logo: ok(null) } });
    await replaceLogo(tenantOf(client, { bakeryId: BAKERY }), PNG);
    expect(calls.some(([kind]) => kind === "remove")).toBe(false);
  });

  it("changes nothing when the file cannot be stored", async () => {
    const { client, calls } = fakeClient({ upload: failed({ message: "The object exceeded the maximum allowed size" }) });
    await expect(replaceLogo(tenantOf(client, { bakeryId: BAKERY }), PNG)).rejects.toMatchObject({ code: "UPLOAD_FAILED", kind: "EXTERNAL_SERVICE" });
    expect(calls.map(([kind]) => kind)).toEqual(["upload"]);
  });

  it("takes the new file away again when the business cannot be pointed at it, keeping the old logo", async () => {
    const { client, calls } = fakeClient({
      rpc: { set_business_logo: failed({ code: "P0001", hint: "RECORD_NOT_FOUND", message: "no business" }) },
    });
    await expect(replaceLogo(tenantOf(client, { bakeryId: BAKERY }), PNG)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    expect(calls.map(([kind]) => kind)).toEqual(["upload", "rpc", "remove"]);
    expect(calls[2]).toEqual(["remove", "business-logos", uploadedPath(calls)]);
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("keeps the new logo when the old file will not delete, and says so in the log", async () => {
    const { client } = fakeClient({ rpc: { set_business_logo: ok(OLD_LOGO) }, remove: failed({ message: "storage down" }) });
    await expect(replaceLogo(tenantOf(client, { bakeryId: BAKERY }), PNG)).resolves.toBeDefined();
    expect(warn).toHaveBeenCalledWith("Logo file not removed", {
      bakeryId: BAKERY,
      logoId: "11111111-1111-4111-8111-111111111111",
      reason: "storage down",
    });
  });
});

describe("readLogo", () => {
  it("answers not found when the business has no logo", async () => {
    const { client, calls } = fakeClient();
    await expect(readLogo(tenantOf(client, { bakeryId: BAKERY }))).rejects.toMatchObject({ code: "NOT_FOUND", httpStatus: 404 });
    expect(calls.some(([kind]) => kind === "download")).toBe(false);
  });

  it("reads the current file, with its type and version", async () => {
    const { client, calls } = fakeClient({ rows: [row({ logo_path: OLD_LOGO, logo_mime_type: "image/png" })] });
    await expect(readLogo(tenantOf(client, { bakeryId: BAKERY }))).resolves.toMatchObject({
      type: "image/png",
      version: "11111111-1111-4111-8111-111111111111",
    });
    expect(calls).toContainEqual(["download", "business-logos", OLD_LOGO]);
  });

  it("says storage failed, in the app's words, when the file cannot be read", async () => {
    const { client } = fakeClient({
      rows: [row({ logo_path: OLD_LOGO, logo_mime_type: "image/png" })],
      download: failed({ message: "Object not found" }),
    });
    await expect(readLogo(tenantOf(client, { bakeryId: BAKERY }))).rejects.toMatchObject({ code: "EXTERNAL_SERVICE_ERROR", kind: "EXTERNAL_SERVICE" });
  });
});

describe("removeBusinessFiles", () => {
  /** The server's storage, as removing a deleted business's files uses it. */
  function storage({
    files = [] as { name: string }[],
    listError = null as { message: string } | null,
    removeError = null as { message: string } | null,
  } = {}) {
    const list = vi.fn().mockResolvedValue({ data: listError ? null : files, error: listError });
    const remove = vi.fn().mockResolvedValue({ data: [], error: removeError });
    const from = vi.fn(() => ({ list, remove }));
    return { admin: { storage: { from } } as unknown as SupabaseClient, from, list, remove };
  }

  beforeEach(() => warn.mockReset());

  it("removes every file in the business's logo folder, an earlier one left behind as well", async () => {
    const { admin, from, list, remove } = storage({ files: [{ name: "one" }, { name: "two" }] });
    await removeBusinessFiles(admin, BAKERY);
    expect(from).toHaveBeenCalledWith("business-logos");
    expect(list).toHaveBeenCalledWith(`bakeries/${BAKERY}/logo`);
    expect(remove).toHaveBeenCalledWith([`bakeries/${BAKERY}/logo/one`, `bakeries/${BAKERY}/logo/two`]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("asks to remove nothing when the business had no logo", async () => {
    const { admin, remove } = storage();
    await removeBusinessFiles(admin, BAKERY);
    expect(remove).not.toHaveBeenCalled();
  });

  it("logs, and does not throw, when the folder cannot be read or its files removed", async () => {
    await removeBusinessFiles(storage({ listError: { message: "down" } }).admin, BAKERY);
    await removeBusinessFiles(storage({ files: [{ name: "one" }], removeError: { message: "denied" } }).admin, BAKERY);
    expect(warn.mock.calls).toEqual([
      ["Business files not removed", { bakeryId: BAKERY, reason: "down" }],
      ["Business files not removed", { bakeryId: BAKERY, reason: "denied" }],
    ]);
  });
});
