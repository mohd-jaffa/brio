import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OfflinePage from "@/app/offline/page";

describe("the offline page", () => {
  it("says the app needs a connection, and offers to try again", () => {
    render(<OfflinePage />);
    expect(screen.getByRole("heading", { level: 1, name: "You’re offline" })).toBeInTheDocument();
    expect(screen.getByText(/needs a connection to show your orders, customers and stock/)).toBeInTheDocument();
  });

  it("tries again with a plain form, which asks for the same address even before a script has loaded", () => {
    render(<OfflinePage />);
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toHaveAttribute("type", "submit");
    expect(retry.closest("form")).toHaveAttribute("method", "get");
    expect(retry.closest("form")).not.toHaveAttribute("action");
  });
});
