import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Package, TrendingUp, Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { FieldError } from "./field-error";
import { PageHeader } from "./page-header";
import { ScreenNotice } from "./screen-notice";
import { SearchInput } from "./search-input";
import { SegmentedControl } from "./segmented-control";
import { SkeletonRows } from "./skeleton";
import { StatTile } from "./stat-tile";
import { StatusBadge } from "./status-badge";

describe("FieldError", () => {
  it("says nothing when nothing is wrong", () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces the message when there is one", () => {
    render(<FieldError id="e1" message="Name needs a value." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Name needs a value.");
  });
});

describe("ScreenNotice", () => {
  it("announces what the screen has to say", () => {
    render(<ScreenNotice>Could not load your customers.</ScreenNotice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your customers.");
  });
});

describe("EmptyState", () => {
  it("says what is missing, why it matters, and how to start", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Users}
        title="No customers yet"
        hint="Start adding your customers."
        action={<Button label="Add Your First Customer" onClick={onClick} />}
      />,
    );

    expect(screen.getByRole("heading", { name: "No customers yet" })).toBeInTheDocument();
    expect(screen.getByText("Start adding your customers.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add Your First Customer" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("PageHeader", () => {
  it("is the screen's one first-level heading", () => {
    render(
      <PageHeader icon={Package} title="Inventory" subtitle="Manage your stock">
        <Button label="Add" />
      </PageHeader>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /Inventory/ })).toBeInTheDocument();
    expect(screen.getByText("Manage your stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

describe("SearchInput", () => {
  it("names itself for a screen reader, not only with a placeholder", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Search by name or phone" />);

    await userEvent.type(screen.getByLabelText("Search by name or phone"), "me");
    expect(onChange).toHaveBeenCalledWith("m");
  });
});

describe("SegmentedControl", () => {
  it("is a real radiogroup, so it can be changed from the keyboard", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Which orders to show"
        value="ACTIVE"
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "PAST", label: "Past" },
        ]}
        onChange={onChange}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Which orders to show" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Active" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Past" }));
    expect(onChange).toHaveBeenCalledWith("PAST");
  });
});

describe("StatusBadge", () => {
  it("shows the word, in the tone the constants chose for it", () => {
    render(<StatusBadge label="Overdue" tone="danger" />);
    const badge = screen.getByText("Overdue");
    expect(badge.className).toContain("text-danger");
  });

  it("is quiet by default", () => {
    render(<StatusBadge label="Delivered" />);
    expect(screen.getByText("Delivered").className).toContain("text-text-muted");
  });
});

describe("StatTile", () => {
  it("shows a figure already formatted — it never decides how money reads", () => {
    render(
      <dl>
        <StatTile label="Today's Revenue" value="₹1,240" tone="success" icon={TrendingUp} />
      </dl>,
    );

    expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
    expect(screen.getByText("₹1,240")).toBeInTheDocument();
  });
});

describe("SkeletonRows", () => {
  it("draws the number of placeholders asked for, hidden from screen readers", () => {
    const { container } = render(<SkeletonRows rows={4} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
  });
});
