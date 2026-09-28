import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("the web app manifest", () => {
  it("opens the app standalone from the root, named as the app is", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      name: "Brio — Made by you. Managed simply.",
      short_name: "Brio",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f6efe5",
      theme_color: "#f6efe5",
    });
  });

  it("has the icons an install needs, one of them shaped for Android's masks", () => {
    expect(manifest().icons).toEqual([
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });
});
