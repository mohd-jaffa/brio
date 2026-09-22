import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES } from "@/constants/messages";
import { notFoundError } from "@/lib/errors";

import { EmptyState } from "./empty-state";
import { ListScreen } from "./list-screen";

interface Row {
  id: string;
  name: string;
}

function list(overrides: Partial<Parameters<typeof ListScreen<Row>>[0]> = {}) {
  return render(
    <ListScreen<Row>
      query={{ isLoading: false, error: undefined, mutate: vi.fn(), ...overrides.query }}
      loadFailed="CUSTOMERS_LOAD_FAILED"
      data={overrides.data}
      keyOf={(row) => row.id}
      renderItem={(row) => <span>{row.name}</span>}
      empty={<EmptyState icon={Users} title="No customers yet" />}
      noMatches={overrides.noMatches}
      columns={overrides.columns}
    />,
  );
}

describe("ListScreen", () => {
  it("shows placeholder rows while it first loads", () => {
    list({ query: { isLoading: true, mutate: vi.fn() }, data: undefined });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says why a first load failed, in the app's own words", () => {
    list({ query: { isLoading: false, error: new TypeError("Failed to fetch"), mutate: vi.fn() } });
    expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES.CUSTOMERS_LOAD_FAILED);
  });

  it("prefers the failure's own words when it has them", () => {
    list({ query: { isLoading: false, error: notFoundError("RECORD_NOT_FOUND"), mutate: vi.fn() } });
    expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES.RECORD_NOT_FOUND);
  });

  it("offers a way to try again, and does", async () => {
    const mutate = vi.fn();
    list({ query: { isLoading: false, error: new Error("offline"), mutate } });

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mutate).toHaveBeenCalledOnce();
  });

  it("says what is missing when the bakery has none of these yet", () => {
    list({ data: [] });
    expect(screen.getByRole("heading", { name: "No customers yet" })).toBeInTheDocument();
  });

  it("says so when a search matches nothing, rather than looking empty", () => {
    list({ data: [], noMatches: "Nothing matches “zzz”." });

    expect(screen.getByText("Nothing matches “zzz”.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No customers yet" })).not.toBeInTheDocument();
  });

  it("draws one list item per row", () => {
    list({ data: [{ id: "1", name: "Meena" }, { id: "2", name: "Anu" }] });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Meena")).toBeInTheDocument();
  });

  it("keeps the rows up when a refresh fails after they have loaded", () => {
    list({ query: { isLoading: false, error: new Error("offline"), mutate: vi.fn() }, data: [{ id: "1", name: "Meena" }] });
    expect(screen.getByText("Meena")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
