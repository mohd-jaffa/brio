import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LaunchReady } from "@/components/launch/LaunchReady";

afterEach(() => {
  delete window.__brioLaunch;
});

describe("LaunchReady", () => {
  it("tells the launch splash the app is ready, once it has come to life", () => {
    const ready = vi.fn();
    window.__brioLaunch = { ready };
    const { container } = render(<LaunchReady />);
    expect(ready).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
  });

  it("has nothing to tell outside a launch", () => {
    expect(() => render(<LaunchReady />)).not.toThrow();
  });
});
