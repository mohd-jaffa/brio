import { act, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBillShare } from "@/features/receipts/hooks/useBillShare";
import type { Bill } from "@/features/receipts/types";

import { aBill } from "@tests/support/bills";
import { Providers } from "@tests/support/providers";

const billImage = vi.hoisted(() => vi.fn());
const share = vi.hoisted(() => vi.fn());
vi.mock("@/features/receipts/image", () => ({ billImage }));
vi.mock("@/lib/native", () => ({ share }));

const png = new File(["png"], "ORD-1006 - Sweet Delights Home Bakery.png", { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.setAttribute("data-theme", "peach");
  billImage.mockResolvedValue(png);
  share.mockResolvedValue("SHARED");
});

const mount = (bill?: Bill) =>
  renderHook(({ current }: { current?: Bill }) => useBillShare(current), {
    wrapper: Providers,
    initialProps: { current: bill },
  });

describe("useBillShare", () => {
  it("draws the image as soon as the bill is there, in the page's theme, and shares that one", async () => {
    const bill = aBill();
    const { result } = mount(bill);
    expect(billImage).toHaveBeenCalledWith(bill, "peach");

    await act(() => result.current.share());
    expect(billImage).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith(
      png,
      "Bill ORD-1006 from Sweet Delights Home Bakery — total ₹1,280, balance due ₹780.",
    );
    expect((await screen.findAllByText("Bill shared")).length).toBeGreaterThan(0);
    expect(result.current.sharing).toBe(false);
  });

  it("says where the file went where it was downloaded instead", async () => {
    const { result } = mount(aBill());
    share.mockResolvedValueOnce("SAVED_AND_COPIED").mockResolvedValueOnce("SAVED");

    await act(() => result.current.share());
    expect(
      await screen.findByText(
        "ORD-1006 - Sweet Delights Home Bakery.png is in your downloads, and its details are copied — paste them beside it.",
      ),
    ).toBeInTheDocument();
    await act(() => result.current.share());
    expect(
      await screen.findByText("ORD-1006 - Sweet Delights Home Bakery.png is in your downloads."),
    ).toBeInTheDocument();
  });

  it("says nothing when the share sheet is closed, and nothing is drawn or shared without a bill", async () => {
    share.mockResolvedValueOnce("CANCELLED");
    const { result, rerender } = mount(undefined);
    await act(() => result.current.share());
    expect(billImage).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();

    rerender({ current: aBill() });
    await act(() => result.current.share());
    expect(screen.queryByText("Bill shared")).not.toBeInTheDocument();
  });

  it("reports a failure, and draws again on the next try", async () => {
    billImage.mockRejectedValueOnce(new Error("fonts"));
    const { result } = mount(aBill());

    await act(() => result.current.share());
    expect(await screen.findByRole("alertdialog", { name: "Bill not shared" })).toHaveTextContent(
      "Could not share this bill. Please try again.",
    );

    await act(() => result.current.share());
    expect(billImage).toHaveBeenCalledTimes(2);
    expect(share).toHaveBeenCalledWith(png, expect.any(String));
  });
});
