import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LaunchSplash } from "@/components/launch/LaunchSplash";
import { LAUNCH } from "@/lib/launch/splash";

describe("LaunchSplash", () => {
  it("names the app with its wordmark, says its line, and carries a bar that says it is opening", () => {
    const { container } = render(<LaunchSplash />);
    const splash = container.querySelector(`#${LAUNCH.id}`) as HTMLElement;
    expect(splash).toHaveClass("launch-splash");

    expect(screen.getByRole("img", { name: "Brio" })).toHaveClass("launch-splash-wordmark");
    expect(screen.getByText("Made by you. Managed simply.")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Opening Brio" });
    expect(bar).toHaveAttribute("id", `${LAUNCH.id}-track`);
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar.querySelector(`#${LAUNCH.id}-bar`)).toBeInTheDocument();
  });

  it("hands its art and wordmark to the styles as backgrounds, fetched only when it shows", () => {
    const { container } = render(<LaunchSplash />);
    const splash = container.querySelector(`#${LAUNCH.id}`) as HTMLElement;
    expect(splash.style.getPropertyValue("--launch-portrait")).toMatch(/^url\(.*portrait\.webp\)$/);
    expect(splash.style.getPropertyValue("--launch-landscape")).toMatch(/^url\(.*landscape\.webp\)$/);
    expect(splash.style.getPropertyValue("--launch-wordmark")).toMatch(/^url\(.*wordmark\.webp\)$/);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
