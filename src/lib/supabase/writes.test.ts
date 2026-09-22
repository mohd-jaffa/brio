import type { PostgrestError, PostgrestMaybeSingleResponse } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { requireRow } from "./writes";

/** What PostgREST answers, shaped the way supabase-js types it. */
function answer<T>(data: T | null, error: PostgrestError | null = null) {
  return Promise.resolve({
    data,
    error,
    count: null,
    status: error ? 409 : data ? 200 : 204,
    statusText: "",
  } as unknown as PostgrestMaybeSingleResponse<T>);
}

describe("requireRow", () => {
  it("returns the row a write changed", async () => {
    await expect(requireRow(answer({ id: "c-1" }), "RECORD_NOT_FOUND")).resolves.toEqual({ id: "c-1" });
  });

  it("reads no row as a refusal, never as success — that is how RLS hides a row", async () => {
    await expect(requireRow(answer(null), "RECORD_NOT_FOUND")).rejects.toMatchObject({
      code: "RECORD_NOT_FOUND",
      kind: "NOT_FOUND",
    });
  });

  it("names the refusal it was given, so the message fits the call", async () => {
    await expect(requireRow(answer(null), "AUTH_ROLE_FORBIDDEN")).rejects.toMatchObject({
      kind: "AUTHORIZATION",
    });
  });

  it("maps the driver's own failure through the catalogue", async () => {
    const duplicate = {
      name: "PostgrestError",
      message: "duplicate key",
      details: "",
      hint: "",
      code: "23505",
    } as PostgrestError;

    await expect(requireRow(answer(null, duplicate), "RECORD_NOT_FOUND")).rejects.toMatchObject({
      kind: "CONFLICT",
    });
  });
});
