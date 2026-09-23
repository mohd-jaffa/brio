import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT, VALIDATION_MESSAGES } from "@/constants/messages";

const { router, client } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  client: { register: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/register",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../api.client", () => ({ AuthClient: client }));

const { RegisterForm } = await import("./RegisterForm");

const VALID = {
  "Your name": "Asha Baker",
  "Bakery name": "Asha Bakes",
  "Mobile number": "9876543210",
  "Email address": "asha@example.com",
};

async function fillIn(overrides: Partial<Record<string, string>> = {}) {
  for (const label of Object.keys(VALID)) {
    await userEvent.type(
      screen.getByLabelText(new RegExp(`^${label}`, "i")),
      overrides[label] ?? VALID[label as keyof typeof VALID],
    );
  }
  await userEvent.type(screen.getByLabelText(/^password/i), overrides.password ?? "hunter22");
  await userEvent.type(
    screen.getByLabelText(/^confirm password/i),
    overrides.confirmPassword ?? "hunter22",
  );
}

const create = () => screen.getByRole("button", { name: UI_TEXT.auth.createAccount });

beforeEach(() => {
  vi.clearAllMocks();
  client.register.mockResolvedValue({ userId: "u-1", bakeryId: "b-1" });
});

describe("creating an account", () => {
  it("asks for everything the plan says an account needs", () => {
    render(<RegisterForm />);

    for (const label of Object.keys(VALID)) {
      expect(screen.getByLabelText(new RegExp(`^${label}`, "i"))).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm password/i)).toBeInTheDocument();
  });

  it("sends the details, with the number and email normalised", async () => {
    render(<RegisterForm />);

    await fillIn({ "Mobile number": "+91 98765 43210", "Email address": "ASHA@Example.com" });
    await userEvent.click(create());

    await waitFor(() =>
      expect(client.register).toHaveBeenCalledWith({
        name: "Asha Baker",
        businessName: "Asha Bakes",
        phone: "+919876543210",
        email: "asha@example.com",
        password: "hunter22",
        confirmPassword: "hunter22",
      }),
    );
  });

  it("will not create an account from two different passwords", async () => {
    render(<RegisterForm />);

    await fillIn({ confirmPassword: "something-else" });
    await userEvent.click(create());

    expect(await screen.findByText(VALIDATION_MESSAGES.passwordsMustMatch)).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it("refuses a password too short to be one", async () => {
    render(<RegisterForm />);

    await fillIn({ password: "short", confirmPassword: "short" });
    await userEvent.click(create());

    expect(await screen.findByText(VALIDATION_MESSAGES.tooShort("Password", 8))).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it("refuses an address that is not one", async () => {
    render(<RegisterForm />);

    await fillIn({ "Email address": "not-an-address" });
    await userEvent.click(create());

    expect(
      await screen.findByText(VALIDATION_MESSAGES.email("Email address")),
    ).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it("sends them to sign in, saying the account is ready", async () => {
    render(<RegisterForm />);

    await fillIn();
    await userEvent.click(create());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?registered=1"));
  });

  it("says when the number or address is already taken", async () => {
    client.register.mockRejectedValue(
      Object.assign(new Error(ERROR_MESSAGES.AUTH_PHONE_ALREADY_EXISTS), {
        code: "AUTH_PHONE_ALREADY_EXISTS",
      }),
    );
    render(<RegisterForm />);

    await fillIn();
    await userEvent.click(create());

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_PHONE_ALREADY_EXISTS)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
