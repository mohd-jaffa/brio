import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "@/constants/messages";

import { fromPostgrestError, kindOf } from "@/lib/errors/fromSupabaseError";

function postgrest(partial: Partial<PostgrestError>): PostgrestError {
  return { name: "PostgrestError", message: "", details: "", hint: "", code: "", ...partial } as PostgrestError;
}

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
