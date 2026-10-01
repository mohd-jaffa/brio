import { afterEach, describe, expect, it, vi } from "vitest";

import { shareMetadata, siteUrl } from "@/lib/share/metadata";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("is the app's own address, so a shared preview's picture and link are whole", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://brio.example");
    expect(siteUrl().href).toBe("https://brio.example/");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(siteUrl().href).toBe("http://localhost:3000/");
  });
});

describe("shareMetadata", () => {
  it("names Brio as a large card, with the line given, and the page's address only where one is meant", () => {
    expect(shareMetadata("What it is.")).toEqual({
      openGraph: { type: "website", siteName: "Brio", title: "Brio", description: "What it is.", locale: "en_IN" },
      twitter: { card: "summary_large_image", title: "Brio", description: "What it is." },
    });
    expect(shareMetadata("What it is.", "/").openGraph).toMatchObject({ url: "/" });
  });
});
