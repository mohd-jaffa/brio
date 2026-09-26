import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Row, RowList } from "@/components/ui/row";
import { StatusPill } from "@/components/ui/status-pill";

describe("RowList and Row", () => {
  it("lists rows in one card, each a link that says everything it shows", () => {
    const { container } = render(
      <RowList label="Recent orders">
        <Row
          href="/orders/1"
          leading={<span>tile</span>}
          title="#ORD-1028"
          subtitle="Chocolate truffle cake (1 kg)"
          meta="Priya Menon · 10:24 AM"
          trailing={
            <>
              ₹1,250
              <StatusPill label="Preparing" tone="preparing" />
            </>
          }
        />
      </RowList>,
    );
    const list = screen.getByRole("list", { name: "Recent orders" });
    expect(list).toHaveClass("divide-y");
    const link = within(list).getByRole("link");
    expect(link).toHaveAttribute("href", "/orders/1");
    expect(link).toHaveTextContent("tile#ORD-1028Chocolate truffle cake (1 kg)Priya Menon · 10:24 AM₹1,250Preparing");
    expect(container.querySelector("svg.lucide-chevron-right")).toBeInTheDocument();
  });

  it("is a button when it acts, and plain when it only shows", async () => {
    const onClick = vi.fn();
    render(
      <RowList>
        <Row title="Priya Menon" onClick={onClick} />
        <Row title="Guest" />
      </RowList>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Priya Menon" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")[1].querySelector("svg")).toBeNull();
  });

  it("drops the chevron when asked", () => {
    render(
      <RowList>
        <Row title="Flour" href="/inventory" chevron={false} />
      </RowList>,
    );
    expect(screen.getByRole("link").querySelector("svg")).toBeNull();
  });

  it("drops a row into place when it has just joined the list", () => {
    render(
      <RowList label="Payments">
        <Row title="Cash" arriving />
        <Row title="UPI" />
      </RowList>,
    );
    const [cash, upi] = screen.getAllByRole("listitem");
    expect(cash).toHaveClass("animate-drop-in");
    expect(upi).not.toHaveClass("animate-drop-in");
  });

  it("keeps a control of its own at the start, beside the row's target rather than inside it", async () => {
    const change = vi.fn();
    const open = vi.fn();
    render(
      <RowList label="Categories">
        <Row
          leadingControl={<button type="button" onClick={change}>Change the picture for Rent</button>}
          title="Rent"
          onClick={open}
        />
      </RowList>,
    );
    const target = screen.getByRole("button", { name: "Rent" });
    const control = screen.getByRole("button", { name: "Change the picture for Rent" });
    expect(target).not.toContainElement(control);
    expect(screen.getByRole("listitem")).toHaveClass("flex");

    await userEvent.click(control);
    expect(change).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    await userEvent.click(target);
    expect(open).toHaveBeenCalledOnce();
  });
});

