import { beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessClient } from "@/features/business/api.client";
import { getJson, patchJson, postFile } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  getJson: vi.fn(),
  patchJson: vi.fn(),
  postFile: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("BusinessClient", () => {
  it("reads and edits the profile at /api/business", async () => {
    await BusinessClient.get();
    expect(getJson).toHaveBeenCalledWith("/api/business");

    const profile = { name: "Sweet Delights", tagline: null, city: "Pune", address: "12 MG Road", phone: "9876543210" };
    await BusinessClient.update(profile);
    expect(patchJson).toHaveBeenCalledWith("/api/business", profile);
  });

  it("sends a logo as the file itself", async () => {
    const file = new File(["png"], "logo.png", { type: "image/png" });
    await BusinessClient.uploadLogo(file);
    expect(postFile).toHaveBeenCalledWith("/api/business/logo", file);
  });
});
