import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ ANDROID_CERT_FINGERPRINTS: [] as string[] }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => env }));

import { GET } from "@/app/.well-known/assetlinks.json/route";

const PLAY = `${"AB:".repeat(31)}AB`;
const UPLOAD = `${"0C:".repeat(31)}0C`;

beforeEach(() => {
  env.ANDROID_CERT_FINGERPRINTS = [];
});

describe("GET /.well-known/assetlinks.json", () => {
  it("vouches for the Android app, signed with the keys named, so it may open the site's links", async () => {
    env.ANDROID_CERT_FINGERPRINTS = [PLAY, UPLOAD];
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await response.json()).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "in.brio.app", sha256_cert_fingerprints: [PLAY, UPLOAD] },
      },
    ]);
  });

  it("vouches for nothing until a key is named", () => {
    expect(GET().status).toBe(404);
  });
});
