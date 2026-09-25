import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TabPanel, Tabs } from "@/components/ui/tabs";

const OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "sales", label: "Sales", count: 12 },
  { value: "orders", label: "Orders" },
] as const;

function Screen() {
  const [tab, setTab] = useState<(typeof OPTIONS)[number]["value"]>("overview");
  return (
    <>
      <Tabs id="analytics" label="Analytics views" value={tab} options={OPTIONS} onChange={setTab} />
      <TabPanel id="analytics" value={tab}>
        Showing {tab}
      </TabPanel>
    </>
  );
}

describe("Tabs", () => {
  it("is a tablist whose chosen tab names the panel it shows", () => {
    render(<Screen />);
    expect(screen.getByRole("tablist", { name: "Analytics views" })).toBeInTheDocument();
    const overview = screen.getByRole("tab", { name: "Overview" });
    expect(overview).toHaveAttribute("aria-selected", "true");
    expect(overview).toHaveClass("after:bg-primary");

    const panel = screen.getByRole("tabpanel", { name: "Overview" });
    expect(panel).toHaveTextContent("Showing overview");
    expect(overview).toHaveAttribute("aria-controls", panel.id);
  });

  it("shows a count beside a tab's name", () => {
    render(<Screen />);
    expect(screen.getByRole("tab", { name: "Sales 12" })).toBeInTheDocument();
  });

  it("switches by a tap, or by the arrow keys as it goes", async () => {
    render(<Screen />);
    await userEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(screen.getByRole("tabpanel", { name: "Orders" })).toHaveTextContent("Showing orders");

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Sales 12" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Showing sales");
    expect(screen.getByRole("tab", { name: "Sales 12" }).querySelector("span")).toHaveClass("bg-primary-soft");
  });
});
