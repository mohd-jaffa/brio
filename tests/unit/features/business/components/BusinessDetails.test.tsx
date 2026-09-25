import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessProfile } from "@/features/business/types";

import { BusinessDetails } from "@/features/business/components/BusinessDetails";

import { Providers } from "@tests/support/providers";

const { query } = vi.hoisted(() => ({
  query: { current: {} as { data?: BusinessProfile; error?: unknown; isValidating?: boolean; mutate: () => void } },
}));
vi.mock("@/features/business/hooks/useBusiness", () => ({ useBusiness: () => query.current }));

beforeEach(() => {
  query.current = { mutate: vi.fn() };
});

describe("BusinessDetails", () => {
  it("holds the screen while the profile loads", () => {
    const { container } = render(<BusinessDetails />, { wrapper: Providers });
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("says the profile could not be loaded, and offers to try again", async () => {
    query.current = { error: new Error("offline"), mutate: vi.fn() };
    render(<BusinessDetails />, { wrapper: Providers });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your business details. Please try again.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(query.current.mutate).toHaveBeenCalledOnce();
  });

  it("shows the form once the profile is here", () => {
    query.current = {
      data: { id: "b-1", name: "Sweet Delights", tagline: null, city: "Pune", address: "12 MG Road", phone: "+919876543210", logoUrl: null },
      mutate: vi.fn(),
    };
    render(<BusinessDetails />, { wrapper: Providers });
    expect(screen.getByRole("form", { name: "Business details" })).toBeInTheDocument();
  });
});
