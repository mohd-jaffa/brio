import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UI_TEXT } from "@/constants/messages";

import Loading from "@/app/loading";

describe("the route loading state", () => {
  it("is announced", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent(UI_TEXT.states.loading);
  });
});
