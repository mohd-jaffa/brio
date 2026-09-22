import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "@/constants/messages";

import { AppError, KIND_STATUS } from "./AppError";
import { errorMessage } from "./errorMessage";
import { fromPostgrestError, kindOf } from "./fromSupabaseError";
import {
  authenticationError,
  authorizationError,
  businessRuleError,
  conflictError,
  externalServiceError,
  internalError,
  isAppError,
  notFoundError,
  signInRequired,
  toAppError,
  validationError,
} from "./kinds";

function postgrest(partial: Partial<PostgrestError>): PostgrestError {
  return { name: "PostgrestError", message: "", details: "", hint: "", code: "", ...partial } as PostgrestError;
}

describe("AppError", () => {
  it("takes its wording from the catalogue and its status from its kind", () => {
    const error = new AppError({ kind: "CONFLICT", code: "CONFLICT" });

    expect(error.message).toBe(ERROR_MESSAGES.CONFLICT);
    expect(error.httpStatus).toBe(KIND_STATUS.CONFLICT);
    expect(error.traceId).toBeTruthy();
  });

  it("serialises only what is safe to send: no cause, no details", () => {
    const error = new AppError({
      kind: "INTERNAL",
      code: "INTERNAL_ERROR",
      cause: new Error("connection string"),
      details: { table: "orders" },
    });

    expect(Object.keys(error.toJSON()).sort()).toEqual(["code", "message", "traceId"]);
    expect(JSON.stringify(error.toJSON())).not.toContain("orders");
  });
});

describe("the error factories", () => {
  it.each([
    [validationError(), "VALIDATION", 400],
    [authenticationError(), "AUTHENTICATION", 401],
    [authorizationError(), "AUTHORIZATION", 403],
    [notFoundError(), "NOT_FOUND", 404],
    [conflictError(), "CONFLICT", 409],
    [businessRuleError("VALIDATION_ERROR"), "BUSINESS_RULE", 422],
    [externalServiceError(), "EXTERNAL_SERVICE", 502],
    [internalError(), "INTERNAL", 500],
  ])("gives %#: kind %s and status %i", (error, kind, status) => {
    expect(error.kind).toBe(kind);
    expect(error.httpStatus).toBe(status);
  });

  it("signInRequired asks for a session rather than reporting a fault", () => {
    expect(signInRequired().code).toBe("AUTH_SESSION_REQUIRED");
  });

  it("recognises its own errors and wraps anything else", () => {
    const mine = conflictError();
    expect(isAppError(mine)).toBe(true);
    expect(toAppError(mine)).toBe(mine);

    const wrapped = toAppError("a string nobody expected");
    expect(wrapped.kind).toBe("INTERNAL");
    expect(wrapped.cause).toBe("a string nobody expected");
  });
});

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

describe("kindOf", () => {
  it.each([
    ["AUTH_SESSION_REQUIRED", "AUTHENTICATION"],
    ["AUTH_ROLE_FORBIDDEN", "AUTHORIZATION"],
    ["RECORD_NOT_FOUND", "NOT_FOUND"],
    ["AUTH_EMAIL_ALREADY_EXISTS", "CONFLICT"],
    ["EXTERNAL_SERVICE_ERROR", "EXTERNAL_SERVICE"],
    ["INTERNAL_ERROR", "INTERNAL"],
    ["VALIDATION_ERROR", "VALIDATION"],
  ] as const)("reads %s as %s", (code, kind) => {
    expect(kindOf(code)).toBe(kind);
  });
});

describe("fromPostgrestError", () => {
  it("reads a row-level security refusal as a refusal, not a fault", () => {
    const error = fromPostgrestError(postgrest({ code: "42501", message: "new row violates policy" }));
    expect(error.kind).toBe("AUTHORIZATION");
    expect(error.httpStatus).toBe(403);
  });

  it("reads a duplicate key as a conflict", () => {
    expect(fromPostgrestError(postgrest({ code: "23505" })).kind).toBe("CONFLICT");
  });

  it("reads a missing single row as not found", () => {
    expect(fromPostgrestError(postgrest({ code: "PGRST116" })).code).toBe("RECORD_NOT_FOUND");
  });

  it("takes the catalogue code a trigger raised in its hint", () => {
    const error = fromPostgrestError(
      postgrest({ code: "P0001", hint: "AUTH_ACCOUNT_INACTIVE", message: "internal text" }),
    );
    expect(error.code).toBe("AUTH_ACCOUNT_INACTIVE");
    expect(error.message).toBe(ERROR_MESSAGES.AUTH_ACCOUNT_INACTIVE);
  });

  it("reads a request that never reached the server as a network failure", () => {
    expect(fromPostgrestError(postgrest({ code: "", message: "TypeError: Failed to fetch" })).kind).toBe(
      "NETWORK",
    );
  });

  it("never lets an unmapped driver message reach the user", () => {
    const error = fromPostgrestError(postgrest({ code: "42703", message: 'column "secret" does not exist' }));
    expect(error.kind).toBe("INTERNAL");
    expect(error.message).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
  });
});
