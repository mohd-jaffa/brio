import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LANDING_SHOTS } from "@/assets/landing";
import { LaptopFrame, PhoneFrame } from "@/components/landing/DeviceFrame";

describe("PhoneFrame", () => {
  it("names only the screenshot: the phone's buttons and its island are drawn, not read", () => {
    const { container } = render(<PhoneFrame src={LANDING_SHOTS.home} alt="Home on a phone" sizes="300px" />);
    expect(screen.getByRole("img", { name: "Home on a phone" })).toHaveAttribute("loading", "lazy");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    const drawn = container.querySelectorAll("[aria-hidden='true']");
    expect([...drawn].map((part) => part.getAttribute("data-button") ?? part.className)).toEqual([
      "action",
      "volume-up",
      "volume-down",
      "side",
      "camera",
      "device-phone-island",
    ]);
  });

  it("fetches the page's first screenshot first, and takes the size it is given", () => {
    const { container } = render(
      <PhoneFrame src={LANDING_SHOTS.home} alt="Home" sizes="300px" lead className="w-[25%]" />,
    );
    const image = screen.getByRole("img", { name: "Home" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(container.firstElementChild).toHaveClass("device-phone", "w-[25%]");
  });
});

describe("LaptopFrame", () => {
  it("shows the desktop screenshot on a laptop, lazily unless it leads", () => {
    const { rerender } = render(
      <LaptopFrame src={LANDING_SHOTS["desktop-home"]} alt="Home on a computer" sizes="600px" />,
    );
    expect(screen.getByRole("img", { name: "Home on a computer" })).toHaveAttribute("loading", "lazy");
    rerender(<LaptopFrame src={LANDING_SHOTS["desktop-home"]} alt="Home on a computer" sizes="600px" lead />);
    expect(screen.getByRole("img", { name: "Home on a computer" })).toHaveAttribute("fetchpriority", "high");
  });
});
