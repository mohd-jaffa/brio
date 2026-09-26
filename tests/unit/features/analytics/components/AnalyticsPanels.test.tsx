import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CustomersPanel,
  IntervalSelect,
  OrdersPanel,
  OverviewPanel,
  ProductsPanel,
  SalesPanel,
} from "@/features/analytics/components/AnalyticsPanels";

import { aReport } from "@tests/support/analytics";
import { sizeCharts } from "@tests/support/charts";

beforeEach(() => sizeCharts());
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "matchMedia");
});

const desktop = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    media: query,
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

describe("OverviewPanel", () => {
  it("draws the period before beneath the trend on a desktop only", () => {
    desktop(true);
    const { container, unmount } = render(<OverviewPanel report={aReport()} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    expect(container.querySelector('[data-series="previous"]')).not.toBeNull();
    expect(screen.getByRole("img", { name: "Sales came to ₹4,500, up 13% on the period before." })).toBeInTheDocument();
    unmount();

    desktop(false);
    const phone = render(<OverviewPanel report={aReport()} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    expect(phone.container.querySelector('[data-series="previous"]')).toBeNull();
  });

  it("words the trend's movement down, level, or with nothing to compare", () => {
    const sales = (value: number, previous: number) => aReport({ kpis: { ...aReport().kpis, sales: { value, previous } } });
    const { rerender } = render(<OverviewPanel report={sales(900, 1000)} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    expect(screen.getByRole("img", { name: /₹9, down 10% on the period before/ })).toBeInTheDocument();
    rerender(<OverviewPanel report={sales(1000, 1000)} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    expect(screen.getByRole("img", { name: /level on the period before/ })).toBeInTheDocument();
    rerender(<OverviewPanel report={sales(1000, 0)} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Sales came to ₹10 in this period." })).toBeInTheDocument();
  });

  it("lists catalogue products as the best sellers, and rings every product's sales, custom items as one", () => {
    render(<OverviewPanel report={aReport()} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    const best = screen.getByRole("list", { name: "Top selling products" });
    expect(within(best).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Truffle cake4 orders₹3,000",
      "Cupcakes3 orders₹1,200",
    ]);

    expect(screen.getByRole("figure", { name: "Sales by product" })).toBeInTheDocument();
    const ring = screen.getByRole("img", { name: "Truffle cake took the most: ₹3,000 of the ₹4,500 items brought in." });
    expect(within(ring).getByText("Item sales")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Sales by product" });
    expect(within(table).getByRole("columnheader", { name: "Product" })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: "Custom items ₹300 6%" })).toBeInTheDocument();
  });

  it("says when nothing sold", () => {
    render(<OverviewPanel report={aReport({ products: [] })} onInterval={vi.fn()} onAllProducts={vi.fn()} />);
    expect(screen.getByText("Nothing sold in this period.")).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Sales by product" })).toHaveTextContent("No sales in this period.");
  });
});

describe("IntervalSelect", () => {
  it("chooses daily or weekly", async () => {
    const onChange = vi.fn();
    render(<IntervalSelect value="DAY" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Group by"), "WEEK");
    expect(onChange).toHaveBeenCalledWith("WEEK");
  });
});

describe("SalesPanel", () => {
  it("compares with the period before always, and splits the sales two ways", () => {
    const { container } = render(<SalesPanel report={aReport()} onInterval={vi.fn()} />);
    expect(container.querySelector('[data-series="previous"]')).not.toBeNull();
    expect(screen.getByRole("img", { name: "Guests bought ₹500; saved customers, ₹4,000." })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "₹3,000 collected; ₹1,500 still to collect." })).toBeInTheDocument();
  });
});

describe("OrdersPanel", () => {
  it("counts orders per group, by status, and by how they were handed over", () => {
    const { rerender } = render(<OrdersPanel report={aReport()} />);
    expect(screen.getByRole("heading", { name: "Orders per day" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "12 orders in this period." })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "5 collected in person, 7 delivered." })).toBeInTheDocument();
    rerender(<OrdersPanel report={aReport({ interval: "WEEK" })} />);
    expect(screen.getByRole("heading", { name: "Orders per week" })).toBeInTheDocument();
  });
});

describe("CustomersPanel", () => {
  it("shows new against returning, and the top customers, Guests left out", () => {
    render(<CustomersPanel report={aReport()} />);
    expect(screen.getByRole("img", { name: "3 new and 6 returning customers ordered." })).toBeInTheDocument();
    const top = screen.getByRole("region", { name: "Top customers" });
    expect(within(top).getByRole("link", { name: /Anu Sharma/ })).toHaveAttribute("href", "/customers/c-1");
    expect(within(top).getByText("Guests are left out.")).toBeInTheDocument();
  });

  it("says when no saved customer ordered", () => {
    render(<CustomersPanel report={aReport({ topCustomers: [] })} />);
    expect(screen.getAllByText("No saved customer ordered in this period.").length).toBeGreaterThan(0);
  });
});

describe("ProductsPanel", () => {
  it("ranks every product by sales, or by how many sold", async () => {
    render(<ProductsPanel report={aReport()} />);
    const names = () => screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(names()[0]).toContain("Truffle cake");
    expect(names()[0]).toContain("4 orders · 4 sold");
    await userEvent.click(screen.getByRole("radio", { name: "Quantity" }));
    expect(names()[0]).toContain("Cupcakes");
  });

  it("breaks a tie on quantity by sales, then by name", async () => {
    const tied = aReport({
      products: [
        { productId: "b", name: "Bun", iconKey: null, orders: 1, quantity: 2, sales: 100 },
        { productId: "a", name: "Apple", iconKey: null, orders: 1, quantity: 2, sales: 100 },
        { productId: "c", name: "Cookie", iconKey: null, orders: 1, quantity: 2, sales: 300 },
      ],
    });
    render(<ProductsPanel report={tied} />);
    await userEvent.click(screen.getByRole("radio", { name: "Quantity" }));
    expect(screen.getAllByRole("listitem").map((item) => item.textContent?.slice(0, 4))).toEqual(["Cook", "Appl", "Bun1"]);
  });

  it("says when nothing sold", () => {
    render(<ProductsPanel report={aReport({ products: [] })} />);
    expect(screen.getByText("Nothing sold in this period.")).toBeInTheDocument();
  });
});
