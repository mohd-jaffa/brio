import { render, screen } from "@testing-library/react";
import { TrendingUp } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatTile } from "@/components/ui/stat-tile";

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
