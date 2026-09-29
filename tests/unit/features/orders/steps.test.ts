import { describe, expect, it } from "vitest";
import * as z from "zod";

import { issuesByPath, readStep, stockRefusal, within } from "@/features/orders/steps";
import { ApiError } from "@/lib/api/client";

describe("readStep", () => {
  it("reads the step in the address, or starts at the items", () => {
    expect(readStep("details")).toBe("details");
    expect(readStep("payment")).toBe("payment");
    expect(readStep(null)).toBe("items");
    expect(readStep("somewhere")).toBe("items");
  });

  it("knows only the steps its screen has", () => {
    expect(readStep("payment", ["items", "details"])).toBe("items");
    expect(readStep("details", ["items", "details"])).toBe("details");
  });
});

describe("issuesByPath and within", () => {
  const error = z
    .object({
      items: z.array(z.string()).min(1, "Add an item"),
      customer: z.string("Choose one"),
      payment: z.string("Pay"),
    })
    .safeParse({ items: [] }).error!;

  it("keeps the first message under each path", () => {
    expect(issuesByPath(error)).toEqual({ items: "Add an item", customer: "Choose one", payment: "Pay" });
  });

  it("gives each step the issues of its own fields and those before it", () => {
    const issues = { items: "Add an item", "customer.id": "Choose one", "payment.amount": "Pay", elsewhere: "x" };
    expect(within(issues, "items")).toEqual({ items: "Add an item" });
    expect(within(issues, "details")).toEqual({ items: "Add an item", "customer.id": "Choose one" });
    expect(within(issues, "payment")).toEqual({
      items: "Add an item",
      "customer.id": "Choose one",
      "payment.amount": "Pay",
    });
  });
});

describe("stockRefusal", () => {
  const short = (details: unknown) => new ApiError(422, "ORDER_INSUFFICIENT_STOCK", "Not enough", "req_1", details);

  it("names what is short, in words, under the title it is given", () => {
    expect(
      stockRefusal(
        short({
          shortfalls: [
            { productId: "p-1", name: "Truffle Cake", available: 2, requested: 3 },
            { productId: "p-2", name: "Bread", available: 0, requested: 1 },
          ],
        }),
        "Changes not saved",
      ),
    ).toEqual({
      title: "Changes not saved",
      message: "Only 2 left of Truffle Cake. Bread is out of stock.",
      requestId: "req_1",
    });
  });

  it("is nothing for any other failure, or a stock refusal that names nothing", () => {
    expect(stockRefusal(new Error("boom"), "t")).toBeNull();
    expect(stockRefusal(new ApiError(409, "ORDER_CHANGED", "Other", "req_2"), "t")).toBeNull();
    expect(stockRefusal(short(undefined), "t")).toBeNull();
    expect(stockRefusal(short({ shortfalls: [] }), "t")).toBeNull();
  });
});
