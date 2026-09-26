import { describe, expect, it } from "vitest";

import { greeting } from "@/features/dashboard/greeting";

describe("greeting", () => {
  it("greets by the part of the day on the business's clock, and the first name (§134 P2-1)", () => {
    expect(greeting(5, "Priya Baker")).toBe("Good morning, Priya");
    expect(greeting(11, "Priya")).toBe("Good morning, Priya");
    expect(greeting(12, "Priya")).toBe("Good afternoon, Priya");
    expect(greeting(16, "Priya")).toBe("Good afternoon, Priya");
    expect(greeting(17, "  Priya  Baker ")).toBe("Good evening, Priya");
    expect(greeting(2, "Priya")).toBe("Good evening, Priya");
  });

  it("still greets when the name is not known yet", () => {
    expect(greeting(9, undefined)).toBe("Good morning");
    expect(greeting(9, "  ")).toBe("Good morning");
  });
});
