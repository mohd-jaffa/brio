import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RowList } from "@/components/ui/row";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { SignOutRow } = await import("@/features/auth/components/SignOutRow");

beforeEach(() => {
  auth.current = authStub();
});

const agree = () =>
  userEvent.click(
    within(screen.getByRole("alertdialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }),
  );

describe("SignOutRow", () => {
  it("asks first, then signs out once, saying so, however often it is tapped", async () => {
    let finish = () => {};
    auth.current = authStub({ signOut: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))) });
    const onSignedOut = vi.fn();
    render(
      <RowList>
        <SignOutRow onSignedOut={onSignedOut} />
      </RowList>,
      { wrapper: Providers },
    );
    const row = screen.getByRole("button", { name: /^Sign out/ });
    await userEvent.click(row);
    expect(auth.current.signOut).not.toHaveBeenCalled();
    await agree();
    await userEvent.click(row);
    expect(row).toHaveTextContent("Signing out…");
    expect(auth.current.signOut).toHaveBeenCalledOnce();
    expect(onSignedOut).toHaveBeenCalledOnce();
    finish();
  });

  it("needs no one to tell when it is done", async () => {
    render(
      <RowList>
        <SignOutRow />
      </RowList>,
      { wrapper: Providers },
    );
    await userEvent.click(screen.getByRole("button", { name: /^Sign out/ }));
    await agree();
    expect(auth.current.signOut).toHaveBeenCalledOnce();
  });
});
