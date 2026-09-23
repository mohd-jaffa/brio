import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { UI_TEXT } from "@/constants/messages";

import { PasswordField } from "./PasswordField";

describe("a password box", () => {
  it("hides what is typed until asked otherwise", () => {
    render(<PasswordField label="Password" />);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("reveals it, and says which state the button will produce", async () => {
    render(<PasswordField label="Password" />);

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.showPassword }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: UI_TEXT.auth.hidePassword })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hides it again", async () => {
    render(<PasswordField label="Password" />);

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.showPassword }));
    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.hidePassword }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("announces what is wrong with it, tied to the box itself", () => {
    render(<PasswordField label="Password" error="Password must be at least 8 characters." />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Password must be at least 8 characters.");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
