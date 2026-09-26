import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesClient } from "@/features/expenses/api.client";
import type { Expense } from "@/features/expenses/types";
import { ExpenseFormSheet } from "@/features/expenses/components/ExpenseFormSheet";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("@/features/expenses/api.client", () => ({
  ExpensesClient: { createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn() },
}));
// The category sheet has its own tests; here it only has to open, and hand back a category it made.
vi.mock("@/features/expenses/components/ExpenseCategorySheet", () => ({
  ExpenseCategorySheet: ({ isOpen, onSaved }: { isOpen: boolean; onSaved: (saved: { category: string }) => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="New category">
        <button type="button" onClick={() => onSaved({ category: "Flowers" })}>
          Made Flowers
        </button>
      </div>
    ) : null,
}));

const boxes: Expense = {
  id: "e-1",
  category: "Packaging",
  description: "Cake boxes, 500 pack",
  amount: 25000, // ₹250.00
  expenseDate: "2026-03-15",
  paymentMethod: "UPI",
  createdAt: "2026-03-15T00:00:00Z",
  updatedAt: "2026-03-15T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}

function open(props: Partial<Parameters<typeof ExpenseFormSheet>[0]> = {}) {
  const all = { isOpen: true, onClose: vi.fn(), ...props };
  render(<ExpenseFormSheet {...all} />, { wrapper });
  return all;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetcher.mockResolvedValue([
    { category: "Ingredients", iconKey: null, custom: false },
    { category: "Packaging", iconKey: null, custom: false },
    { category: "Rent", iconKey: null, custom: false },
    { category: "Delivery", iconKey: null, custom: false },
    { category: "Flowers", iconKey: "rose-bunch", custom: true },
  ]);
});

describe("ExpenseFormSheet", () => {
  it("is out of sight while it is closed", () => {
    const { container } = render(
      <ExpenseFormSheet isOpen={false} onClose={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("starts on today, so the common case is no typing", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-24T10:00:00Z"));
    open();
    expect(screen.getByLabelText(/Date/)).toHaveValue("2026-09-24");
    vi.useRealTimers();
  });

  it("starts on the business's today, not UTC's, just after midnight in India", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-24T19:00:00Z")); // 00:30 on the 25th in India
    open();
    expect(screen.getByLabelText(/Date/)).toHaveValue("2026-09-25");
    vi.useRealTimers();
  });

  it("shows a stored amount in rupees", () => {
    open({ initialData: boxes });

    expect(screen.getByRole("heading", { name: "Edit expense" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toHaveValue("250.00");
    expect(screen.getByRole("radio", { name: "Packaging" })).toBeChecked();
  });

  it("sends a typed amount as whole paise", async () => {
    vi.mocked(ExpensesClient.createExpense).mockResolvedValue(boxes);
    const props = open();

    await userEvent.type(screen.getByLabelText(/Description/), "Flour and sugar");
    await userEvent.type(screen.getByLabelText(/Amount/), "1250.75");
    await userEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() =>
      expect(ExpensesClient.createExpense).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Flour and sugar", amount: 125075 }),
      ),
    );
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect((await screen.findAllByText("Expense saved"))[0]).toBeInTheDocument();
  });

  it("refuses an expense with no description", async () => {
    open();

    await userEvent.type(screen.getByLabelText(/Amount/), "100");
    await userEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(ExpensesClient.createExpense).not.toHaveBeenCalled();
  });

  it("offers the eight until the business's categories arrive, then its own too, each with its picture (§139.11.10)", async () => {
    open();
    const categories = screen.getByRole("group", { name: "Category" });
    expect(within(categories).getAllByRole("radio")).toHaveLength(8);
    expect(await within(categories).findByRole("radio", { name: "Flowers" })).toBeInTheDocument();
    expect(within(categories).getByRole("radio", { name: "Ingredients" })).toBeChecked();
    expect(within(categories).queryByRole("radio", { name: "Fireworks" })).not.toBeInTheDocument();
    const flowers = within(categories).getByRole("radio", { name: "Flowers" }).closest("label")!;
    expect(flowers.querySelector("img")?.getAttribute("src")).toMatch(/rose-bunch/);
    expect(within(categories).getByRole("radio", { name: "Rent" }).closest("label")!.querySelector("img")?.getAttribute("src")).toMatch(
      /default-expense/,
    );
  });

  it("saves the category chosen, and keeps the sheet open when refused", async () => {
    vi.mocked(ExpensesClient.updateExpense).mockRejectedValue(new ApiError(409, "CONFLICT", "That was changed elsewhere."));
    const props = open({ initialData: boxes });
    await userEvent.click(screen.getByRole("radio", { name: "Delivery" }));
    await userEvent.click(screen.getByRole("button", { name: "Save expense" }));
    await waitFor(() =>
      expect(ExpensesClient.updateExpense).toHaveBeenCalledWith("e-1", expect.objectContaining({ category: "Delivery" })),
    );
    expect((await screen.findAllByText("Expense not saved"))[0]).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("makes a category on the spot from + at the end of the list, and chooses it", async () => {
    open();
    const categories = screen.getByRole("group", { name: "Category" });
    await within(categories).findByRole("radio", { name: "Flowers" });
    await userEvent.click(within(categories).getByRole("button", { name: "New category" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "New category" })).getByRole("button", { name: "Made Flowers" }));
    expect(within(categories).getByRole("radio", { name: "Flowers" })).toBeChecked();
  });
});

describe("ExpenseFormSheet: deleting an expense", () => {
  it("offers Delete only for an expense already recorded", () => {
    open();
    expect(screen.queryByRole("button", { name: "Delete expense" })).not.toBeInTheDocument();
  });

  it("deletes the expense once it is confirmed, and says so", async () => {
    vi.mocked(ExpensesClient.deleteExpense).mockResolvedValue({ deleted: true });
    const props = open({ initialData: boxes });
    await userEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Delete this expense?" });
    expect(confirm).toHaveTextContent("Cake boxes, 500 pack, ₹250. This cannot be undone.");
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(ExpensesClient.deleteExpense).toHaveBeenCalledWith("e-1"));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect((await screen.findAllByText("Expense deleted"))[0]).toBeInTheDocument();
  });

  it("keeps the expense when the owner thinks better of it, and says why when it is refused", async () => {
    vi.mocked(ExpensesClient.deleteExpense).mockRejectedValue(new ApiError(500, "SAVE_FAILED", "Could not delete."));
    const props = open({ initialData: boxes });
    await userEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(ExpensesClient.deleteExpense).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect((await screen.findAllByText("Expense not deleted"))[0]).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
