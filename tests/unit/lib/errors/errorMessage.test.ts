import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "@/constants/messages";

import { errorMessage } from "@/lib/errors/errorMessage";
import { notFoundError } from "@/lib/errors/kinds";

describe("errorMessage", () => {
  it("shows the app's own wording for its own errors", () => {
    expect(errorMessage(notFoundError("RECORD_NOT_FOUND"))).toBe(ERROR_MESSAGES.RECORD_NOT_FOUND);
  });

  it("falls back to the catalogue for anything else, never the internals", () => {
    expect(errorMessage(new TypeError("Failed to fetch"), "ORDERS_LOAD_FAILED")).toBe(
      ERROR_MESSAGES.ORDERS_LOAD_FAILED,
    );
  });
});
