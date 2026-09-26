import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { API_MAX_ROWS } from "@/constants/limits";
import { AppError } from "@/lib/errors";
import { readAll } from "@/lib/supabase/readAll";

describe("readAll", () => {
  it("reads window after window until one comes back short, and joins them", async () => {
    const window = vi.fn(async (from: number, to: number) => ({
      data: from === 0 ? [1, 2] : from === 2 ? [3, 4] : [5],
      error: null,
      to,
    }));
    expect(await readAll<number>(window, 2)).toEqual([1, 2, 3, 4, 5]);
    expect(window.mock.calls.map(([from, to]) => [from, to])).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("asks for the API's own limit at a time by default, and reads nothing as nothing", async () => {
    const window = vi.fn(async () => ({ data: null, error: null }));
    expect(await readAll(window)).toEqual([]);
    expect(window).toHaveBeenCalledWith(0, API_MAX_ROWS - 1);
  });

  it("passes on a failure in the app's own words", async () => {
    const error = { code: "PGRST000", message: "down", details: "", hint: "" } as unknown as PostgrestError;
    await expect(readAll(async () => ({ data: null, error }))).rejects.toBeInstanceOf(AppError);
  });
});
