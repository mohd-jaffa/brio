import { render as renderBare, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ErrorMessageCode } from "@/constants/messages";
import type { BusinessProfile } from "@/features/business/types";
import { ApiError } from "@/lib/api/client";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth, business } = vi.hoisted(() => ({
  auth: { current: {} as ReturnType<typeof authStub> },
  business: { current: {} as { data?: Partial<BusinessProfile> } },
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
vi.mock("@/features/business/hooks/useBusiness", () => ({ useBusiness: () => business.current }));

const { DeleteAccount } = await import("@/features/auth/components/DeleteAccount");

const render = (ui: ReactElement) => renderBare(ui, { wrapper: Providers });

const refusal = (code: ErrorMessageCode, message: string) => new ApiError(400, code, message, "req_1");

const deleteAccount = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  deleteAccount.mockResolvedValue(undefined);
  auth.current = authStub({ deleteAccount });
  business.current = { data: { name: "Sweet Delights" } };
});

const fields = () => ({
  phone: screen.getByLabelText(/^This account’s sign-in number/),
  email: screen.getByLabelText(/^This account’s email address/),
  password: screen.getByLabelText(/^Your password(?!, again)/),
  again: screen.getByLabelText(/^Your password, again/),
});

async function fill({
  phone = "9876543210",
  email = "asha@example.com",
  password = "Password123!",
  again = undefined as string | undefined,
} = {}) {
  again ??= password;
  const box = fields();
  await userEvent.type(box.phone, phone);
  await userEvent.type(box.email, email);
  await userEvent.type(box.password, password);
  await userEvent.type(box.again, again);
}

const deleteButton = () => screen.getByRole("button", { name: /^Delete my account|^Deleting your account/ });

const answer = async (choice: "Delete forever" | "Keep my account") => {
  const card = await screen.findByRole("alertdialog", { name: "Delete everything now?" });
  await userEvent.click(within(card).getByRole("button", { name: choice }));
};

describe("DeleteAccount", () => {
  it("says first, and plainly, that everything goes for good, and what", () => {
    render(<DeleteAccount />);
    expect(screen.getByRole("heading", { level: 1, name: "Delete your account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/settings");
    const warning = screen.getByRole("region", { name: "Everything goes, for good" });
    expect(warning).toHaveTextContent("deletes your business with it, straight away");
    expect(within(warning).getAllByRole("listitem")).toHaveLength(7);
    expect(warning).toHaveTextContent("Every customer, with their numbers and addresses.");
    expect(screen.getByRole("region", { name: "Before you go" })).toHaveTextContent("Sign out instead");
  });

  it("posts if sent before the page has loaded, so nothing typed lands in the address", () => {
    render(<DeleteAccount />);
    const form = deleteButton().closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).not.toHaveAttribute("action");
  });

  it("asks for every field before anything else", async () => {
    render(<DeleteAccount />);
    await userEvent.click(deleteButton());
    expect(await screen.findByText("Mobile number needs a value.")).toBeInTheDocument();
    expect(screen.getByText("Email address needs a value.")).toBeInTheDocument();
    expect(screen.getByText("Password needs a value.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("holds the two passwords to each other before it asks", async () => {
    render(<DeleteAccount />);
    await fill({ again: "Password124!" });
    await userEvent.click(deleteButton());
    expect(await screen.findByText("Both passwords must be the same.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks once more, naming the business, and sends nothing when the owner keeps the account", async () => {
    render(<DeleteAccount />);
    await fill();
    await userEvent.click(deleteButton());
    const card = await screen.findByRole("alertdialog", { name: "Delete everything now?" });
    expect(card).toHaveTextContent("Your account and Sweet Delights, with every order");
    await answer("Keep my account");
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("says “your business” when the business has not been read", async () => {
    business.current = {};
    render(<DeleteAccount />);
    await fill();
    await userEvent.click(deleteButton());
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Your account and your business, with every order",
    );
  });

  it("deletes with what was typed once agreed, and stays busy while the page leaves", async () => {
    render(<DeleteAccount />);
    await fill({ phone: "98765 43210", email: "Asha@Example.com" });
    await userEvent.click(deleteButton());
    await answer("Delete forever");
    await waitFor(() =>
      expect(deleteAccount).toHaveBeenCalledWith({
        phone: "+919876543210",
        email: "asha@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      }),
    );
    await waitFor(() => expect(deleteButton()).toHaveTextContent("Deleting your account…"));
  });

  it.each([
    ["ACCOUNT_PHONE_MISMATCH", "That is not this account’s sign-in number.", "phone"],
    ["ACCOUNT_EMAIL_MISMATCH", "That is not this account’s email address.", "email"],
    ["AUTH_PASSWORD_INCORRECT", "That is not your current password.", "password"],
  ] as const)("puts a %s refusal beside its field", async (code, message, field) => {
    deleteAccount.mockRejectedValue(refusal(code, message));
    render(<DeleteAccount />);
    await fill();
    await userEvent.click(deleteButton());
    await answer("Delete forever");
    await waitFor(() => expect(fields()[field]).toHaveAccessibleDescription(expect.stringContaining(message)));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deleteButton()).toHaveTextContent("Delete my account");
  });

  it("shows any other failure on a card, with its reference", async () => {
    deleteAccount.mockRejectedValue(refusal("ACCOUNT_DELETE_FAILED", "Could not delete your account."));
    render(<DeleteAccount />);
    await fill();
    await userEvent.click(deleteButton());
    await answer("Delete forever");
    const card = await screen.findByRole("alertdialog", { name: "Account not deleted" });
    expect(card).toHaveTextContent("Could not delete your account.");
    expect(card).toHaveTextContent("req_1");
  });

  it("says a request that never reached the server on a card too, and deletes nothing", async () => {
    deleteAccount.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DeleteAccount />);
    await fill();
    await userEvent.click(deleteButton());
    await answer("Delete forever");
    expect(await screen.findByRole("alertdialog", { name: "Account not deleted" })).toBeInTheDocument();
  });
});
