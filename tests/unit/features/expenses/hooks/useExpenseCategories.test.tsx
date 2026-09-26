import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EXPENSE_CATEGORIES } from "@/constants/statuses";
import { useExpenseCategories } from "@/features/expenses/hooks/useExpenseCategories";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

beforeEach(() => fetcher.mockReset());

describe("useExpenseCategories", () => {
  it("has the defaults on their default pictures until the business's categories arrive", async () => {
    fetcher.mockResolvedValue([
      { category: "Packaging", iconKey: "shopping-bags", custom: false },
      { category: "Flowers", iconKey: null, custom: true },
    ]);
    const { result } = renderHook(() => useExpenseCategories(), { wrapper: Providers });
    expect(result.current.names).toEqual(DEFAULT_EXPENSE_CATEGORIES);
    expect(result.current.iconOf("Packaging")).toBeNull();

    await waitFor(() => expect(result.current.names).toEqual(["Packaging", "Flowers"]));
    expect(fetcher).toHaveBeenCalledWith("/api/expense-categories");
    expect(result.current.iconOf("Packaging")).toBe("shopping-bags");
    expect(result.current.iconOf("Flowers")).toBeNull();
    expect(result.current.iconOf("Rent")).toBeNull();
  });
});
