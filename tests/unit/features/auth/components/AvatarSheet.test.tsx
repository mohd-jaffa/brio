import { render as renderBare, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { authStub, TEST_PROFILE } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth, client } = vi.hoisted(() => ({
  auth: { current: {} as ReturnType<typeof authStub> },
  client: { changeAvatar: vi.fn() },
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));

const { AvatarSheet } = await import("@/features/auth/components/AvatarSheet");

const render = (ui: ReactElement) => renderBare(ui, { wrapper: Providers });
const chooser = () => screen.getByRole("dialog", { name: "Choose a profile picture" });

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
});

describe("AvatarSheet", () => {
  it("is out of sight until opened, and closes from its close button", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<AvatarSheet open={false} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<AvatarSheet open onClose={onClose} />);
    await userEvent.click(within(chooser()).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("offers the nine pictures in the sheet's order, each named by its animal, the one in use marked", () => {
    render(<AvatarSheet open onClose={vi.fn()} />);
    const group = within(chooser()).getByRole("radiogroup", { name: "Choose a profile picture" });
    const choices = within(group).getAllByRole("radio");
    expect(choices.map((choice) => choice.textContent)).toEqual([
      "Pomeranian",
      "Hamster",
      "Blue bear",
      "Husky",
      "Polar bear",
      "Cream kitten",
      "Ginger cat",
      "Beagle",
      "Tiger",
    ]);
    expect(choices.filter((choice) => choice.getAttribute("aria-checked") === "true")).toEqual([
      within(group).getByRole("radio", { name: "Husky" }),
    ]);
    expect(chooser()).toHaveTextContent("It shows on your account, beside your name.");
  });

  it("saves another picture there and then, reads the account again and says so", async () => {
    client.changeAvatar.mockResolvedValue({ ...TEST_PROFILE, avatar: "tiger" });
    const onClose = vi.fn();
    render(<AvatarSheet open onClose={onClose} />);

    await userEvent.click(within(chooser()).getByRole("radio", { name: "Tiger" }));

    await waitFor(() => expect(client.changeAvatar).toHaveBeenCalledWith({ avatar: "tiger" }));
    expect(auth.current.reload).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Profile picture changed");
  });

  it("shows the picture being saved as busy, and takes no second tap meanwhile", async () => {
    let finish: (value: unknown) => void = () => {};
    client.changeAvatar.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<AvatarSheet open onClose={vi.fn()} />);

    await userEvent.click(within(chooser()).getByRole("radio", { name: "Tiger" }));
    expect(within(chooser()).getByRole("radiogroup")).toHaveAttribute("aria-busy", "true");
    await userEvent.click(within(chooser()).getByRole("radio", { name: "Beagle" }));
    expect(client.changeAvatar).toHaveBeenCalledOnce();

    finish({ ...TEST_PROFILE, avatar: "tiger" });
    await waitFor(() => expect(within(chooser()).getByRole("radiogroup")).not.toHaveAttribute("aria-busy"));
  });

  it("just closes on the picture already in use", async () => {
    const onClose = vi.fn();
    render(<AvatarSheet open onClose={onClose} />);

    await userEvent.click(within(chooser()).getByRole("radio", { name: "Husky" }));
    expect(onClose).toHaveBeenCalled();
    expect(client.changeAvatar).not.toHaveBeenCalled();
  });

  it("stays open on a failure, which it says on a card with the request's id", async () => {
    client.changeAvatar.mockRejectedValue(new ApiError(503, "EXTERNAL_SERVICE_ERROR", "The service is unavailable.", "req_9"));
    const onClose = vi.fn();
    render(<AvatarSheet open onClose={onClose} />);

    await userEvent.click(within(chooser()).getByRole("radio", { name: "Tiger" }));

    const card = await screen.findByRole("alertdialog", { name: "Picture not changed" });
    expect(card).toHaveTextContent("req_9");
    expect(onClose).not.toHaveBeenCalled();
    expect(auth.current.reload).not.toHaveBeenCalled();
  });

  it("marks the first picture when there is no account to read one from", () => {
    auth.current = authStub({ profile: null });
    render(<AvatarSheet open onClose={vi.fn()} />);
    expect(within(chooser()).getByRole("radio", { name: "Pomeranian" })).toHaveAttribute("aria-checked", "true");
  });
});
