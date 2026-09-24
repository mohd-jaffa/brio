import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { HOME_ROUTE } from "@/constants/routes";

import ScreenError from "@/app/error";

describe("the error screen", () => {
  it("never shows the error's own text, only its reference", () => {
    const error = Object.assign(new Error("relation \"orders\" does not exist"), { digest: "4012887" });
    render(<ScreenError error={error} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: UI_TEXT.system.errorTitle })).toBeInTheDocument();
    expect(screen.getByText(UI_TEXT.system.errorReference("4012887"))).toBeInTheDocument();
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
  });

  it("tries the screen again when asked", async () => {
    const retry = vi.fn();
    render(<ScreenError error={new Error("boom")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.actions.retry }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("also offers the way back to the dashboard", () => {
    render(<ScreenError error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.getByRole("link", { name: UI_TEXT.system.toDashboard })).toHaveAttribute("href", HOME_ROUTE);
  });
});
