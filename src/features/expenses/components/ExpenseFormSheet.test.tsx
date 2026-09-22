import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesClient } from "../api.client";
import type { Expense } from "../types";
import { ExpenseFormSheet } from "./ExpenseFormSheet";

vi.mock("../api.client", () => ({
  ExpensesClient: { createExpense: vi.fn(), updateExpense: vi.fn() },
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
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

function open(props: Partial<Parameters<typeof ExpenseFormSheet>[0]> = {}) {
  const all = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn(), ...props };
  render(<ExpenseFormSheet {...all} />, { wrapper });
  return all;
}

beforeEach(() => vi.clearAllMocks());

describe("ExpenseFormSheet", () => {
  it("renders nothing while it is closed", () => {
    const { container } = render(
      <ExpenseFormSheet isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
      { wrapper },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("starts on today, so the common case is no typing", () => {
    open();
    expect(screen.getByLabelText(/Date/)).toHaveValue(new Date().toISOString().slice(0, 10));
  });

  it("shows a stored amount in rupees", () => {
    open({ initialData: boxes });

    expect(screen.getByRole("heading", { name: "Edit Expense" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toHaveValue("250.00");
    expect(screen.getByLabelText(/Category/)).toHaveValue("Packaging");
  });

  it("sends a typed amount as whole paise", async () => {
    vi.mocked(ExpensesClient.createExpense).mockResolvedValue(boxes);
    const props = open();

    await userEvent.type(screen.getByLabelText(/Description/), "Flour and sugar");
    await userEvent.type(screen.getByLabelText(/Amount/), "1250.75");
    await userEvent.click(screen.getByRole("button", { name: "Save Expense" }));

    await waitFor(() =>
      expect(ExpensesClient.createExpense).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Flour and sugar", amount: 125075 }),
      ),
    );
    expect(props.onSuccess).toHaveBeenCalledOnce();
  });

  it("refuses an expense with no description", async () => {
    open();

    await userEvent.type(screen.getByLabelText(/Amount/), "100");
    await userEvent.click(screen.getByRole("button", { name: "Save Expense" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(ExpensesClient.createExpense).not.toHaveBeenCalled();
  });

  it("offers only the categories the database accepts", () => {
    open();
    expect(screen.getByRole("option", { name: "Ingredients" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Fireworks" })).not.toBeInTheDocument();
  });
});
