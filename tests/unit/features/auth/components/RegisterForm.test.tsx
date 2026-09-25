import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT, VALIDATION_MESSAGES } from "@/constants/messages";
import { ApiError } from "@/lib/api/client";
import { Providers } from "@tests/support/providers";

const { router, client } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  client: { register: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/register",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));

const { RegisterForm } = await import("@/features/auth/components/RegisterForm");

const YOU = {
  "Your name": "Asha Baker",
  "Mobile number": "9876543210",
  "Email address": "asha@example.com",
};

const BUSINESS = {
  "Business name": "Asha Bakes",
  City: "Pune",
  Address: "12 MG Road",
};

// Only what is on screen: the other step is hidden, and so out of reach.
const field = (label: string) => screen.getByRole("textbox", { name: new RegExp(`^${label}`, "i") });
const password = () => screen.getByLabelText(/^password/i);
const confirm = () => screen.getByLabelText(/^confirm password/i);

async function fillYou(overrides: Partial<Record<string, string>> = {}) {
  for (const label of Object.keys(YOU)) {
    await userEvent.type(field(label), overrides[label] ?? YOU[label as keyof typeof YOU]);
  }
  await userEvent.type(password(), overrides.password ?? "hunter22");
  await userEvent.type(confirm(), overrides.confirmPassword ?? "hunter22");
}

async function fillBusiness(overrides: Partial<Record<string, string>> = {}) {
  for (const label of Object.keys(BUSINESS)) {
    await userEvent.type(field(label), overrides[label] ?? BUSINESS[label as keyof typeof BUSINESS]);
  }
}

const next = () => screen.getByRole("button", { name: UI_TEXT.auth.next });
const create = () => screen.getByRole("button", { name: UI_TEXT.auth.createAccount });

async function fillBoth() {
  await fillYou();
  await userEvent.click(next());
  await fillBusiness();
}

beforeEach(() => {
  vi.clearAllMocks();
  client.register.mockResolvedValue({ userId: "u-1", bakeryId: "b-1" });
});

describe("creating an account", () => {
  it("starts with you: step 1 of 2, and nothing about the business yet", () => {
    render(<RegisterForm />, { wrapper: Providers });

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "You" })).toBeInTheDocument();
    for (const label of Object.keys(YOU)) expect(field(label)).toBeInTheDocument();
    expect(password()).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Your business" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: UI_TEXT.auth.createAccount })).not.toBeInTheDocument();
  });

  it("checks the first step before moving on, and sends nothing", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillYou({ "Email address": "not-an-address" });
    await userEvent.click(next());

    expect(await screen.findByText(VALIDATION_MESSAGES.email("Email address"))).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it("will not move on from two different passwords, or one too short", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillYou({ confirmPassword: "something-else" });
    await userEvent.click(next());
    expect(await screen.findByText(VALIDATION_MESSAGES.passwordsMustMatch)).toBeInTheDocument();

    await userEvent.clear(password());
    await userEvent.type(password(), "short");
    await userEvent.click(next());
    expect(await screen.findByText(VALIDATION_MESSAGES.tooShort("Password", 8))).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
  });

  it("moves to your business, announcing it and taking focus to its heading", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillYou();
    await userEvent.click(next());

    expect(screen.getByText("Step 2 of 2")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("heading", { name: "Your business" })).toHaveFocus();
    for (const label of Object.keys(BUSINESS)) expect(field(label)).toBeInTheDocument();
    expect(field("Catch phrase")).toHaveAccessibleName(/Catch phrase \(Optional\)/);
  });

  it("takes Enter on the first step as Next, not as Create account", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillYou();
    await userEvent.type(confirm(), "{Enter}");

    expect(await screen.findByText("Step 2 of 2")).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it("keeps what was typed when going back", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillBoth();
    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.back }));

    expect(screen.getByRole("heading", { name: "You" })).toHaveFocus();
    expect(field("Your name")).toHaveValue("Asha Baker");
    await userEvent.click(next());
    expect(field("City")).toHaveValue("Pune");
  });

  it("asks for the city and address the bill prints (Q2)", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillYou();
    await userEvent.click(next());
    await userEvent.type(field("Business name"), "Asha Bakes");
    await userEvent.click(create());

    expect(await screen.findByText(VALIDATION_MESSAGES.required("City"))).toBeInTheDocument();
    expect(screen.getByText(VALIDATION_MESSAGES.required("Address"))).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });

  it("sends both steps as one request, normalised, with a blank catch phrase as none", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillYou({ "Mobile number": "+91 98765 43210", "Email address": "ASHA@Example.com" });
    await userEvent.click(next());
    await fillBusiness({ City: "  Pune " });
    await userEvent.click(create());

    await waitFor(() =>
      expect(client.register).toHaveBeenCalledWith({
        name: "Asha Baker",
        phone: "+919876543210",
        email: "asha@example.com",
        password: "hunter22",
        confirmPassword: "hunter22",
        businessName: "Asha Bakes",
        tagline: null,
        city: "Pune",
        address: "12 MG Road",
      }),
    );
    expect(client.register).toHaveBeenCalledOnce();
  });

  it("sends them to sign in, saying the account is ready", async () => {
    render(<RegisterForm />, { wrapper: Providers });

    await fillBoth();
    await userEvent.click(create());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    // The card, from the provider above every route, goes with them.
    expect(screen.getByRole("status")).toHaveTextContent(UI_TEXT.outcomes.accountCreated);
  });

  it("takes them back to the number when it is already taken, and marks it there", async () => {
    client.register.mockRejectedValue(
      new ApiError(409, "AUTH_PHONE_ALREADY_EXISTS", ERROR_MESSAGES.AUTH_PHONE_ALREADY_EXISTS, "req_1"),
    );
    render(<RegisterForm />, { wrapper: Providers });

    await fillBoth();
    await userEvent.click(create());

    const card = await screen.findByRole("alertdialog", { name: UI_TEXT.outcomes.accountNotCreated });
    expect(card).toHaveTextContent(ERROR_MESSAGES.AUTH_PHONE_ALREADY_EXISTS);
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(field("Mobile number")).toHaveAttribute("aria-invalid", "true");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("stays on the business step for any other refusal", async () => {
    client.register.mockRejectedValue(new ApiError(502, "EXTERNAL_SERVICE_ERROR", ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
    render(<RegisterForm />, { wrapper: Providers });

    await fillBoth();
    await userEvent.click(create());

    expect(await screen.findByRole("alertdialog", { name: UI_TEXT.outcomes.accountNotCreated })).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
  });
});
