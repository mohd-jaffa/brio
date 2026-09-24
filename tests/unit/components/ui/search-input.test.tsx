import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchInput } from "@/components/ui/search-input";

describe("SearchInput", () => {
  it("names itself for a screen reader, not only with a placeholder", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Search by name or phone" />);

    await userEvent.type(screen.getByLabelText("Search by name or phone"), "me");
    expect(onChange).toHaveBeenCalledWith("m");
  });
});
