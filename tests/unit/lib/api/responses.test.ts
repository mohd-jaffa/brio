import { describe, it, expect } from "vitest";
import { buildErrorPayload } from "@/lib/api/responses";
import { authenticationError } from "@/lib/errors";
import { redactSensitive } from "@/lib/logger";

describe("API error contract", () => {
  it("returns the standard safe error payload", () => {
    const payload = buildErrorPayload(
      authenticationError("AUTH_INVALID_CREDENTIALS", {
        password: "should-not-leak",
      }),
      "req_test",
    );

    expect(payload.success).toBe(false);
    if (!payload.success) {
      expect(payload.error.code).toBe("AUTH_INVALID_CREDENTIALS");
      expect(payload.error.message).toBe("The phone number or password is incorrect.");
      expect(payload.error.requestId).toBe("req_test");
    }
  });

  it("redacts sensitive structured log keys recursively", () => {
    const redacted = redactSensitive({
      phone: "+919876543210",
      password: "secret",
      nested: {
        accessToken: "token",
        service_role_key: "role-key",
      },
    });

    expect(redacted).toEqual({
      phone: "+919876543210",
      password: "[Redacted]",
      nested: {
        accessToken: "[Redacted]",
        service_role_key: "[Redacted]",
      },
    });
  });
});
