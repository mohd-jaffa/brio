import { render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: "New customer" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");
  });

  it("opens filled in for one being edited", () => {
    open({ initialData: meena });

    expect(screen.getByRole("heading", { name: "Edit customer" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Meena Gupta");
    expect(screen.getByLabelText("Email (Optional)")).toHaveValue("meena@example.com");
    // The field carries +91 itself, and is read out with it.
    const phone = screen.getByLabelText(/Phone number/);
    expect(phone).toHaveValue("98765 43210");
    expect(phone).toHaveAttribute("inputmode", "numeric");
    expect(phone).toHaveAccessibleDescription("+91");
  });

  it("fills in the map link and the notes where the customer has them, and leaves the rest blank", () => {
    open({
      initialData: {
        ...meena,
        email: undefined,
        address: undefined,
        googleMapsLink: "https://maps.app.goo.gl/meena",
        notes: "Eggless",
      },
    });
    expect(screen.getByLabelText(/Map link/)).toHaveValue("https://maps.app.goo.gl/meena");
    expect(screen.getByLabelText(/Notes/)).toHaveValue("Eggless");
    expect(screen.getByLabelText("Email (Optional)")).toHaveValue("");
    expect(screen.getByLabelText(/Address/)).toHaveValue("");
  });

  it("starts each opening afresh, and never clears what is being typed while it is open", async () => {
    const sheet = (props: { isOpen: boolean; initialData?: Customer }) => (
      <CustomerFormSheet onClose={vi.fn()} onSuccess={vi.fn()} {...props} />
    );
    const { rerender } = render(sheet({ isOpen: true }), { wrapper });
    await userEvent.type(screen.getByLabelText(/Full name/), "Kavya");
    rerender(sheet({ isOpen: true }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Kavya");

    rerender(sheet({ isOpen: false }));
    rerender(sheet({ isOpen: true }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");

    rerender(sheet({ isOpen: false, initialData: meena }));
    rerender(sheet({ isOpen: true, initialData: meena }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Meena Gupta");
  });

  it("refuses to save without the fields the database requires", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Save customer" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(CustomersClient.createCustomer).not.toHaveBeenCalled();
  });

  it("creates a customer with the phone number normalised", async () => {
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue(meena);
    const props = open();

    await userEvent.type(screen.getByLabelText(/Full name/), "Meena Gupta");
    await userEvent.type(screen.getByLabelText(/Phone number/), "98765 43210");
    await userEvent.click(screen.getByRole("button", { name: "Save customer" }));

    await waitFor(() =>
      expect(CustomersClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Meena Gupta", phone: "+919876543210" }),
      ),
    );
    expect(props.onSuccess).toHaveBeenCalledWith(meena);
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("stores the fields left blank as nothing, not as empty text", async () => {
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue(meena);
    open();

    await userEvent.type(screen.getByLabelText(/Full name/), "Anu");
    await userEvent.type(screen.getByLabelText(/Phone number/), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: "Save customer" }));

    await waitFor(() =>
      expect(CustomersClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ email: null, address: null, notes: null }),
      ),
    );
  });

  it("updates the customer it was opened on", async () => {
    vi.mocked(CustomersClient.updateCustomer).mockResolvedValue(meena);
    open({ initialData: meena });

    await userEvent.clear(screen.getByLabelText(/Full name/));
    await userEvent.type(screen.getByLabelText(/Full name/), "Meena G");
    await userEvent.click(screen.getByRole("button", { name: "Save customer" }));

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

    await userEvent.type(screen.getByLabelText(/Full name/), "Meena");
    await userEvent.type(screen.getByLabelText(/Phone number/), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: "Save customer" }));

    await waitFor(() =>
      expect(screen.getByText("That phone number is already taken.")).toBeInTheDocument(),
    );
    expect(props.onClose).not.toHaveBeenCalled();
  });

  describe("when the number already belongs to a customer (§139.6)", () => {
    const taken = (details?: unknown) =>
      new ApiError(409, "CUSTOMER_PHONE_ALREADY_EXISTS", "That phone number is already taken.", "req_1", details);

    async function saveMeena() {
      await userEvent.type(screen.getByLabelText(/Full name/), "Meena");
      await userEvent.type(screen.getByLabelText(/Phone number/), "9876543210");
      await userEvent.click(screen.getByRole("button", { name: "Save customer" }));
      return screen.findByRole("alertdialog", { name: "Customer not saved" });
    }

    it("names who has it, and offers to use them instead", async () => {
      vi.mocked(CustomersClient.createCustomer).mockRejectedValue(taken({ customerId: "c-1", name: "Meena Gupta" }));
      const props = open({ onUseExisting: vi.fn() });

      const card = await saveMeena();
      expect(card).toHaveTextContent("Meena Gupta already has this number.");
      expect(card).toHaveTextContent("req_1");
      await userEvent.click(within(card).getByRole("button", { name: "Use that customer" }));
      expect(props.onUseExisting).toHaveBeenCalledWith("c-1");
      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it("goes back to the form to put the number right", async () => {
      vi.mocked(CustomersClient.createCustomer).mockRejectedValue(taken({ customerId: "c-1", name: "Meena Gupta" }));
      const props = open({ onUseExisting: vi.fn() });

      const card = await saveMeena();
      await userEvent.click(within(card).getByRole("button", { name: "Edit" }));
      expect(props.onUseExisting).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Phone number/)).toHaveValue("9876543210");
    });

    it("shows the refusal as it is where there is no one to use, or no one named", async () => {
      vi.mocked(CustomersClient.createCustomer).mockRejectedValue(taken({ customerId: "c-1", name: "Meena Gupta" }));
      const { unmount } = render(<CustomerFormSheet isOpen onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
      expect(await saveMeena()).toHaveTextContent("That phone number is already taken.");
      unmount();

      for (const details of [undefined, { customerId: 7, name: "Meena" }, { customerId: "c-1" }]) {
        vi.mocked(CustomersClient.createCustomer).mockRejectedValue(taken(details));
        const view = render(<CustomerFormSheet isOpen onClose={vi.fn()} onSuccess={vi.fn()} onUseExisting={vi.fn()} />, {
          wrapper,
        });
        const card = await saveMeena();
        expect(card).toHaveTextContent("That phone number is already taken.");
        expect(within(card).queryByRole("button", { name: "Use that customer" })).not.toBeInTheDocument();
        view.unmount();
      }
    });
  });
});
