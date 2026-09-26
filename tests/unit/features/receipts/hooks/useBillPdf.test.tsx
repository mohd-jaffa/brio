import { act, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBillPdf } from "@/features/receipts/hooks/useBillPdf";
import type { Bill } from "@/features/receipts/types";
import { ApiError } from "@/lib/api/client";

import { aBill } from "@tests/support/bills";
import { Providers } from "@tests/support/providers";

const getFile = vi.hoisted(() => vi.fn());
const saveFile = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  getFile,
}));
vi.mock("@/lib/native", () => ({ saveFile }));

const pdf = new Blob(["%PDF"], { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.setAttribute("data-theme", "golden");
  getFile.mockResolvedValue(pdf);
});

const mount = (bill?: Bill) => renderHook(() => useBillPdf("o-1", bill), { wrapper: Providers });

describe("useBillPdf", () => {
  it("asks the server for the PDF in the page's theme, and saves it under the bill's name", async () => {
    const { result } = mount(aBill());
    await act(() => result.current.download());

    expect(getFile).toHaveBeenCalledWith("/api/orders/o-1/bill.pdf?theme=golden");
    expect(saveFile).toHaveBeenCalledWith(pdf, "ORD-1006 - Sweet Delights Home Bakery.pdf");
    expect(
      await screen.findByText("ORD-1006 - Sweet Delights Home Bakery.pdf is in your downloads."),
    ).toBeInTheDocument();
    expect(result.current.downloading).toBe(false);
  });

  it("reports a PDF that could not be made, in the API's words", async () => {
    getFile.mockRejectedValue(new ApiError(404, "RECORD_NOT_FOUND", "That record could not be found.", "req_4"));
    const { result } = mount(aBill());
    await act(() => result.current.download());

    expect(await screen.findByRole("alertdialog", { name: "PDF not saved" })).toHaveTextContent(
      "That record could not be found.",
    );
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("does nothing before the bill is there", async () => {
    const { result } = mount(undefined);
    await act(() => result.current.download());
    expect(getFile).not.toHaveBeenCalled();
  });
});
