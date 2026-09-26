import { render as renderBare, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ErrorMessageCode } from "@/constants/messages";
import { ApiError } from "@/lib/api/client";
import { authStub, TEST_PROFILE } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth, client } = vi.hoisted(() => ({
  auth: { current: {} as ReturnType<typeof authStub> },
  client: { changeName: vi.fn(), changePhone: vi.fn(), changeEmail: vi.fn() },
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));

const { AccountChangeSheet } = await import("@/features/auth/components/AccountChangeSheet");

const render = (ui: ReactElement) => renderBare(ui, { wrapper: Providers });

const refusal = (code: ErrorMessageCode, message: string) => new ApiError(422, code, message, "req_1");

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
});

describe("AccountChangeSheet", () => {
  it("is out of sight until a detail is chosen, and closes from its close button", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<AccountChangeSheet field={undefined} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<AccountChangeSheet field="name" onClose={onClose} />);
    await userEvent.click(within(screen.getByRole("dialog", { name: "Change your name" })).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("changes the name, reads the account again and says so", async () => {
    client.changeName.mockResolvedValue({ ...TEST_PROFILE, name: "Asha B" });
    const onClose = vi.fn();
    render(<AccountChangeSheet field="name" onClose={onClose} />);
    const name = screen.getByLabelText(/Your name/);
    expect(name).toHaveValue(TEST_PROFILE.name);
    expect(screen.getByRole("dialog")).toHaveTextContent("once every 30 days");

    await userEvent.clear(name);
    await userEvent.type(name, "  Asha   B ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(client.changeName).toHaveBeenCalledWith({ name: "Asha B" }));
    expect(auth.current.reload).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Name changed");
  });

  it("starts empty when there is no account to fill it from", () => {
    auth.current = authStub({ profile: null });
    render(<AccountChangeSheet field="name" onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Your name/)).toHaveValue("");
  });

  it("says an unchanged name beside it, and a refusal about when on a card", async () => {
    client.changeName.mockRejectedValueOnce(refusal("PROFILE_VALUE_SAME", "That is what it is already."));
    render(<AccountChangeSheet field="name" onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("That is what it is already.")).toBeInTheDocument();

    client.changeName.mockRejectedValueOnce(refusal("PROFILE_CHANGE_TOO_SOON", "This can be changed once every 30 days."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const card = await screen.findByRole("alertdialog", { name: "Not changed" });
    expect(card).toHaveTextContent("This can be changed once every 30 days.");

    // Nor is a password refusal the name form's to show beside anything.
    await userEvent.click(within(card).getByRole("button", { name: "Close" }));
    client.changeName.mockRejectedValueOnce(refusal("AUTH_PASSWORD_INCORRECT", "That is not your current password."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alertdialog", { name: "Not changed" })).toHaveTextContent("That is not your current password.");
  });

  it("changes the sign-in number with the current password, and says which to sign in with", async () => {
    client.changePhone.mockResolvedValue({ ...TEST_PROFILE, phone: "+919000022222" });
    render(<AccountChangeSheet field="phone" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Change sign-in number" })).toHaveTextContent(
      "You will sign in with the new number from now on.",
    );
    await userEvent.type(screen.getByLabelText(/New sign-in number/), "90000 22222");
    await userEvent.type(screen.getByLabelText(/Current password/), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(client.changePhone).toHaveBeenCalledWith({ phone: "+919000022222", password: "Password123!" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sign-in number changed. Sign in with +91 90000 22222 from now on.");
  });

  it("puts a wrong password and a taken number beside their fields", async () => {
    render(<AccountChangeSheet field="phone" onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/New sign-in number/), "9000022222");
    await userEvent.type(screen.getByLabelText(/Current password/), "nope-nope");

    client.changePhone.mockRejectedValueOnce(refusal("AUTH_PASSWORD_INCORRECT", "That is not your current password."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("That is not your current password.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute("aria-invalid", "true");

    client.changePhone.mockRejectedValueOnce(refusal("AUTH_PHONE_ALREADY_EXISTS", "An account with this phone number already exists."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("An account with this phone number already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText(/New sign-in number/)).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for a new email with the current password, and says where its link went", async () => {
    client.changeEmail.mockResolvedValue({ ...TEST_PROFILE, pendingEmail: "asha.new@example.com" });
    render(<AccountChangeSheet field="email" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Change email address" })).toHaveTextContent("It takes over once you follow it");
    await userEvent.type(screen.getByLabelText(/New email address/), "Asha.New@Example.com");
    await userEvent.type(screen.getByLabelText(/Current password/), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(client.changeEmail).toHaveBeenCalledWith({ email: "asha.new@example.com", password: "Password123!" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Check your new inbox. A link is on its way to asha.new@example.com. Your email changes once you follow it.",
    );
  });

  it("puts a taken address and a wrong password beside their fields, and anything else on a card", async () => {
    client.changeEmail.mockResolvedValueOnce({ ...TEST_PROFILE, pendingEmail: null });
    render(<AccountChangeSheet field="email" onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/New email address/), "taken@example.com");
    await userEvent.type(screen.getByLabelText(/Current password/), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("status")).toHaveTextContent("A link is on its way to .");

    client.changeEmail.mockRejectedValueOnce(refusal("AUTH_EMAIL_ALREADY_EXISTS", "An account with this email address already exists."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("An account with this email address already exists.")).toBeInTheDocument();

    client.changeEmail.mockRejectedValueOnce(refusal("AUTH_PASSWORD_INCORRECT", "That is not your current password."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("That is not your current password.")).toBeInTheDocument();

    client.changeEmail.mockRejectedValueOnce(new Error("offline"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alertdialog", { name: "Not changed" })).toBeInTheDocument();
  });
});
