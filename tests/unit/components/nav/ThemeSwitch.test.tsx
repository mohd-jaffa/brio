import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/lib/theme/ThemeProvider";

import { ThemeSwitch } from "@/components/nav/ThemeSwitch";

describe("ThemeSwitch", () => {
  it("chooses between Golden and Peach", async () => {
    render(
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>,
    );
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Peach" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("peach");
    expect(screen.getByRole("radio", { name: "Peach" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Golden" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("golden");
  });
});
