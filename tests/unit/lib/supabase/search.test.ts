import { describe, expect, it } from "vitest";

import { containsPattern, ilikeFilter, phoneDigits } from "@/lib/supabase/search";

describe("containsPattern", () => {
  it("matches the words anywhere, spaces kept", () => {
    expect(containsPattern("Anu Sharma")).toBe("%Anu Sharma%");
  });

  it("drops wildcards and what would break a PostgREST filter", () => {
    expect(containsPattern(`50%_off\\ "cake" (big), a*b:c`)).toBe("%50 off cake big a b c%");
  });

  it("has nothing to look for when nothing safe is left", () => {
    expect(containsPattern(" %_* ")).toBeNull();
  });
});

describe("ilikeFilter", () => {
  it("quotes the pattern, so a space cannot split the filter", () => {
    expect(ilikeFilter("name", "%Anu Sharma%")).toBe('name.ilike."%Anu Sharma%"');
  });
});

describe("phoneDigits", () => {
  it("reads a phone however it was typed (BUG-23)", () => {
    expect(phoneDigits("98765 43210")).toBe("9876543210");
    expect(phoneDigits("+91-98765-43210")).toBe("9876543210");
    expect(phoneDigits("919876543210")).toBe("9876543210");
    expect(phoneDigits("543")).toBe("543");
  });

  it("says too little to match on with fewer than three digits", () => {
    expect(phoneDigits("Anu 12")).toBeNull();
    expect(phoneDigits("Anu")).toBeNull();
  });
});
