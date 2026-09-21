import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ERROR_CODES } from "../../src/shared/constants/errors";
import { buildErrorPayload } from "../../src/shared/api/responses";
import { AuthenticationError } from "../../src/shared/errors/app-error";
import { redactSensitive } from "../../src/shared/logging/logger";

describe("API error contract", () => {
  it("returns the standard safe error payload", () => {
    const payload = buildErrorPayload(
      new AuthenticationError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
        password: "should-not-leak",
      }),
      "req_test",
    );

    assert.equal(payload.success, false);
    assert.equal(payload.error.code, ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    assert.equal(payload.error.message, "The phone number or password is incorrect.");
    assert.equal(payload.error.requestId, "req_test");
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

    assert.deepEqual(redacted, {
      phone: "+919876543210",
      password: "[Redacted]",
      nested: {
        accessToken: "[Redacted]",
        service_role_key: "[Redacted]",
      },
    });
  });
});
