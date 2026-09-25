import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

import { CustomersClient } from "@/features/customers/api.client";
import type { Customer } from "@/features/customers/types";
import { CustomerFormSheet } from "@/features/customers/components/CustomerFormSheet";

import { Providers } from "@tests/support/providers";

vi.mock("@/features/customers/api.client", () => ({
  CustomersClient: { createCustomer: vi.fn(), updateCustomer: vi.fn() },
}));

const meena: Customer = {
  id: "c-1",
  name: "Meena Gupta",
  phone: "+919876543210",
  email: "meena@example.com",
  address: "12 Baker Lane",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}

function open(props: Partial<Parameters<typeof CustomerFormSheet>[0]> = {}) {
  const all = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn(), ...props };
  render(<CustomerFormSheet {...all} />, { wrapper });
  return all;
}

beforeEach(() => vi.clearAllMocks());

describe("CustomerFormSheet", () => {
  it("is out of sight while it is closed", () => {
    const { container } = render(
      <CustomerFormSheet isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("opens blank for a new customer", () => {
    open();
    expect(screen.getByRole("heading", { name: "New Customer" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("");
  });

  it("opens filled in for one being edited", () => {
    open({ initialData: meena });

    expect(screen.getByRole("heading", { name: "Edit Customer" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("Meena Gupta");
    expect(screen.getByLabelText("Email (Optional)")).toHaveValue("meena@example.com");
    // The field carries +91 itself, and is read out with it.
    const phone = screen.getByLabelText(/Phone Number/);
    expect(phone).toHaveValue("98765 43210");
    expect(phone).toHaveAccessibleDescription("+91");
  });

  it("refuses to save without the fields the database requires", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(CustomersClient.createCustomer).not.toHaveBeenCalled();
  });

  it("creates a customer with the phone number normalised", async () => {
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue(meena);
    const props = open();

    await userEvent.type(screen.getByLabelText(/Full Name/), "Meena Gupta");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "98765 43210");
    await userEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() =>
      expect(CustomersClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Meena Gupta", phone: "+919876543210" }),
      ),
    );
    expect(props.onSuccess).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("stores the fields left blank as nothing, not as empty text", async () => {
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue(meena);
    open();

    await userEvent.type(screen.getByLabelText(/Full Name/), "Anu");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() =>
      expect(CustomersClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ email: null, address: null, notes: null }),
      ),
    );
  });

  it("updates the customer it was opened on", async () => {
    vi.mocked(CustomersClient.updateCustomer).mockResolvedValue(meena);
    open({ initialData: meena });

    await userEvent.clear(screen.getByLabelText(/Full Name/));
    await userEvent.type(screen.getByLabelText(/Full Name/), "Meena G");
    await userEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() =>
      expect(CustomersClient.updateCustomer).toHaveBeenCalledWith(
        "c-1",
        expect.objectContaining({ name: "Meena G" }),
      ),
    );
  });

  it("shows the server's own refusal and stays open", async () => {
    vi.mocked(CustomersClient.createCustomer).mockImplementation(() =>
      Promise.reject(new ApiError(409, "CONFLICT", "That phone number is already taken.")),
    );
    const props = open();

    await userEvent.type(screen.getByLabelText(/Full Name/), "Meena");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() =>
      expect(screen.getByText("That phone number is already taken.")).toBeInTheDocument(),
    );
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
