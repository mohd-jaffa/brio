import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authStub } from "@/test-utils/auth";

const { router, query, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  query: { current: new URLSearchParams() },
  auth: { current: {} as ReturnType<typeof authStub> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/login",
  useSearchParams: () => query.current,
}));
vi.mock("../AuthProvider", () => ({ useAuth: () => auth.current }));

const { RedirectWhenSignedIn } = await import("./RedirectWhenSignedIn");

beforeEach(() => {
  vi.clearAllMocks();
  query.current = new URLSearchParams();
  auth.current = authStub({ status: "anonymous", profile: null });
});

const signInScreen = () =>
  render(<RedirectWhenSignedIn><p>Sign in form</p></RedirectWhenSignedIn>);

describe("an already-signed-in visitor", () => {
  it("is shown the form while nobody is signed in", () => {
    signInScreen();

    expect(screen.getByText("Sign in form")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("is sent on to the app rather than asked to sign in again", async () => {
    auth.current = authStub();
    signInScreen();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Sign in form")).not.toBeInTheDocument();
  });

  it("is sent where they were originally heading", async () => {
    query.current = new URLSearchParams("next=%2Fcustomers");
    auth.current = authStub();
    signInScreen();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/customers"));
  });

  it("is sent to replace a temporary password first", async () => {
    auth.current = authStub({ requiresPasswordChange: true });
    signInScreen();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/change-password"));
  });
});
