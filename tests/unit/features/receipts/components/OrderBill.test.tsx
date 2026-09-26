import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const share = vi.hoisted(() => vi.fn());
const download = vi.hoisted(() => vi.fn());
const useBillShare = vi.hoisted(() => vi.fn());
const useBillPdf = vi.hoisted(() => vi.fn());
vi.mock("@/features/receipts/hooks/useBillShare", () => ({ useBillShare }));
vi.mock("@/features/receipts/hooks/useBillPdf", () => ({ useBillPdf }));

beforeEach(() => {
  vi.clearAllMocks();
  useBillShare.mockReturnValue({ share, sharing: false });
  useBillPdf.mockReturnValue({ download, downloading: false });
});

const open = (onClose = vi.fn(), isOpen = true) =>
  render(<OrderBill orderId="o-1" orderNumber="ORD-1006" open={isOpen} onClose={onClose} />, { wrapper: Providers });

describe("OrderBill", () => {
  it("reads the bill only when it is opened", () => {
    open(vi.fn(), false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("builds the order's bill when opened, with Share where Print was, and Download PDF", async () => {
    const bill = aBill();
    fetcher.mockResolvedValue(bill);
    open();
    const dialog = screen.getByRole("dialog", { name: "Bill ORD-1006" });
    expect(within(dialog).getByRole("button", { name: "Share" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Download PDF" })).toBeDisabled();

    expect(await within(dialog).findByRole("article", { name: "Bill ORD-1006" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/orders/o-1/bill");
    expect(useBillShare).toHaveBeenLastCalledWith(bill);
    expect(useBillPdf).toHaveBeenLastCalledWith("o-1", bill);
    expect(within(dialog).queryByRole("button", { name: /print/i })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Share" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Download PDF" }));
    expect(share).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledOnce();
  });

  it("shows each action busy while it works", () => {
    useBillShare.mockReturnValue({ share, sharing: true });
    useBillPdf.mockReturnValue({ download, downloading: true });
    open(vi.fn(), false);
    // Closed, the dialog hands the hooks no bill to work on.
    expect(useBillShare).toHaveBeenLastCalledWith(undefined);
    open();
    for (const name of ["Share", "Download PDF"]) {
      expect(screen.getAllByRole("button", { name, hidden: true }).at(-1)).toHaveAttribute("aria-busy", "true");
    }
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
