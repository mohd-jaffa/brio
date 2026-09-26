// @vitest-environment node
// The server's own Blob and Buffer, as the route has them.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrderById = vi.hoisted(() => vi.fn());
const findPaymentsByOrderId = vi.hoisted(() => vi.fn());
const getCustomerById = vi.hoisted(() => vi.fn());
const getBusiness = vi.hoisted(() => vi.fn());
const readLogo = vi.hoisted(() => vi.fn());
const billPdf = vi.hoisted(() => vi.fn());
const toPng = vi.hoisted(() => vi.fn());
const warn = vi.hoisted(() => vi.fn());
vi.mock("@/features/orders/queries", () => ({ getOrderById }));
vi.mock("@/features/payments/api", () => ({ findPaymentsByOrderId }));
vi.mock("@/features/customers/api", () => ({ getCustomerById }));
vi.mock("@/features/business/api", () => ({ getBusiness, readLogo }));
vi.mock("@/features/receipts/pdf", () => ({ billPdf }));
vi.mock("sharp", () => ({ default: (input: Buffer) => ({ png: () => ({ toBuffer: () => toPng(input) }) }) }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn, error: vi.fn() } }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://ovenly.app" }) }));

import { getBill, getBillPdf } from "@/features/receipts/api";

import { aBusiness } from "@tests/support/bills";
import { anOrder, aPayment } from "@tests/support/orders";
import { tenantOf } from "@tests/support/tenant";

const tenant = tenantOf({});

beforeEach(() => {
  vi.clearAllMocks();
  findPaymentsByOrderId.mockResolvedValue([aPayment()]);
  getCustomerById.mockResolvedValue({ id: "c-1", name: "Meena Gupta", phone: "+919834567890" });
  getBusiness.mockResolvedValue(aBusiness());
});

describe("getBill", () => {
  it("reads the order, its payments, its customer and the business, through the caller's own client", async () => {
    getOrderById.mockResolvedValue(anOrder());
    const bill = await getBill(tenant, "o-1");

    expect(getOrderById).toHaveBeenCalledWith(tenant, "o-1");
    expect(findPaymentsByOrderId).toHaveBeenCalledWith(tenant, "o-1");
    expect(getCustomerById).toHaveBeenCalledWith(tenant, "c-1");
    expect(getBusiness).toHaveBeenCalledWith(tenant);
    expect(bill).toMatchObject({
      kind: "CONFIRMED",
      orderNumber: "ORD-1006",
      billedTo: { kind: "CUSTOMER", name: "Meena Gupta" },
      business: { name: "Sweet Delights Home Bakery" },
      payments: [{ method: "CASH", amount: 50000 }],
      appUrl: "https://ovenly.app",
    });
  });

  it("reads no customer for a Guest order", async () => {
    getOrderById.mockResolvedValue(anOrder({ customerId: null }));
    expect((await getBill(tenant, "o-1")).billedTo).toEqual({ kind: "GUEST" });
    expect(getCustomerById).not.toHaveBeenCalled();
  });

  it("passes on an order that is not this business's", async () => {
    getOrderById.mockRejectedValue(new Error("not found"));
    await expect(getBill(tenant, "o-9")).rejects.toThrow("not found");
    expect(getBusiness).not.toHaveBeenCalled();
  });
});

describe("getBillPdf", () => {
  const pdf = Buffer.from("%PDF-1.3");

  beforeEach(() => {
    getOrderById.mockResolvedValue(anOrder());
    billPdf.mockResolvedValue(pdf);
  });

  it("answers with the PDF as a download named for the order and the business, kept by no cache", async () => {
    readLogo.mockResolvedValue({ file: new Blob([new Uint8Array([1, 2])]), type: "image/png", version: "logo-1" });
    const response = await getBillPdf(tenant, "o-1", "peach");

    expect(billPdf).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: "ORD-1006" }), {
      theme: "peach",
      logo: Buffer.from([1, 2]),
    });
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toBe(
      "attachment; filename=\"ORD-1006 - Sweet Delights Home Bakery.pdf\"; filename*=UTF-8''ORD-1006%20-%20Sweet%20Delights%20Home%20Bakery.pdf",
    );
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("%PDF-1.3");
  });

  it("turns a WebP logo into a PNG, which a PDF can hold, and keeps a name no old client can read to itself", async () => {
    getBusiness.mockResolvedValue(aBusiness({ name: "Café Crème" }));
    readLogo.mockResolvedValue({ file: new Blob([new Uint8Array([9])]), type: "image/webp", version: "logo-1" });
    toPng.mockResolvedValue(Buffer.from("png"));
    const response = await getBillPdf(tenant, "o-1", "golden");

    expect(toPng).toHaveBeenCalledWith(Buffer.from([9]));
    expect(billPdf).toHaveBeenCalledWith(expect.anything(), { theme: "golden", logo: Buffer.from("png") });
    expect(response.headers.get("Content-Disposition")).toContain('filename="ORD-1006 - Caf_ Cr_me.pdf"');
  });

  it("draws the cake mark when there is no logo, or when it cannot be read", async () => {
    getBusiness.mockResolvedValue(aBusiness({ logoUrl: null }));
    await getBillPdf(tenant, "o-1", "golden");
    expect(readLogo).not.toHaveBeenCalled();
    expect(billPdf).toHaveBeenLastCalledWith(expect.anything(), { theme: "golden", logo: null });

    getBusiness.mockResolvedValue(aBusiness());
    readLogo.mockRejectedValueOnce(new TypeError("storage down")).mockRejectedValueOnce("odd");
    await getBillPdf(tenant, "o-1", "golden");
    await getBillPdf(tenant, "o-1", "golden");
    expect(billPdf).toHaveBeenLastCalledWith(expect.anything(), { theme: "golden", logo: null });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("cake mark"), { bakeryId: "b-1", reason: "TypeError" });
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining("cake mark"), { bakeryId: "b-1", reason: "unknown" });
  });
});
