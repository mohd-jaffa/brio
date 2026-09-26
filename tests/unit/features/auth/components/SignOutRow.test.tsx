import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RowList } from "@/components/ui/row";
import { authStub } from "@tests/support/auth";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { SignOutRow } = await import("@/features/auth/components/SignOutRow");

beforeEach(() => {
  auth.current = authStub();
});

describe("SignOutRow", () => {
  it("signs out once, saying so, however often it is tapped", async () => {
    let finish = () => {};
    auth.current = authStub({ signOut: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))) });
    const onSignedOut = vi.fn();
    render(
      <RowList>
        <SignOutRow onSignedOut={onSignedOut} />
      </RowList>,
    );
    const row = screen.getByRole("button", { name: /^Sign out/ });
    await userEvent.click(row);
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
    );
    await userEvent.click(screen.getByRole("button", { name: /^Sign out/ }));
    expect(auth.current.signOut).toHaveBeenCalledOnce();
  });
});
