import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderBill } from "@/features/receipts/components/OrderBill";
import { ApiError } from "@/lib/api/client";

import { aBill } from "@tests/support/bills";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

beforeEach(() => vi.clearAllMocks());

const open = (onClose = vi.fn(), isOpen = true) =>
  render(<OrderBill orderId="o-1" orderNumber="ORD-1006" open={isOpen} onClose={onClose} />, { wrapper: Providers });

describe("OrderBill", () => {
  it("reads the bill only when it is opened", () => {
    open(vi.fn(), false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("builds the order's bill when opened", async () => {
    fetcher.mockResolvedValue(aBill());
    open();
    expect(await screen.findByRole("article", { name: "Bill ORD-1006" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/orders/o-1/bill");
    expect(screen.getByRole("dialog", { name: "Bill ORD-1006" })).toBeInTheDocument();
  });

  it("closes and says so when the bill could not be built", async () => {
    fetcher.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_9"));
    const onClose = vi.fn();
    open(onClose);
    expect(await screen.findByRole("alertdialog", { name: "Bill not ready" })).toHaveTextContent(
      "Something went wrong.",
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
