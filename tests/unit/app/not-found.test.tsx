import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { HOME_ROUTE } from "@/constants/routes";

import NotFound from "@/app/not-found";

describe("the not-found screen", () => {
  it("names the problem and leads back to the dashboard", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: UI_TEXT.system.notFoundTitle })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: UI_TEXT.system.toDashboard })).toHaveAttribute("href", HOME_ROUTE);
  });
});
