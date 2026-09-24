import { render, screen } from "@testing-library/react";
import { Compass } from "lucide-react";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import { Pending } from "./pending";
import { SystemScreen } from "./system-screen";

describe("SystemScreen", () => {
  it("says what happened as the page's heading, and offers a way on", () => {
    render(
      <SystemScreen icon={Compass} title="Not here" body="The link may be out of date.">
        <Link href="/">Go home</Link>
      </SystemScreen>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Not here" })).toBeInTheDocument();
    expect(screen.getByText("The link may be out of date.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });

  it("shows a reference only when there is one", () => {
    const { rerender } = render(
      <SystemScreen icon={Compass} title="Failed" body="Try again." reference="Reference: abc123">
        <span />
      </SystemScreen>,
    );
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();

    rerender(
      <SystemScreen icon={Compass} title="Failed" body="Try again.">
        <span />
      </SystemScreen>,
    );
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });
});

describe("Pending", () => {
  it("announces the wait in words, not only with a spinner", () => {
    render(<Pending message="Loading…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("can wait inside a sheet without painting a whole screen", () => {
    render(<Pending message="Confirming…" inline />);
    expect(screen.getByRole("status")).not.toHaveClass("min-h-screen");
  });
});
