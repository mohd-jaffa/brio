import { beforeEach, describe, expect, it, vi } from "vitest";

const { postJson } = vi.hoisted(() => ({ postJson: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ postJson }));

import { NotificationsClient } from "@/features/notifications/api.client";

beforeEach(() => postJson.mockReset().mockResolvedValue({}));

describe("NotificationsClient", () => {
  it("marks one read at its own route", async () => {
    await NotificationsClient.markRead("n-1");
    expect(postJson).toHaveBeenCalledWith("/api/notifications/n-1/read");
  });

  it("marks them all read", async () => {
    await NotificationsClient.markAllRead();
    expect(postJson).toHaveBeenCalledWith("/api/notifications/read-all");
  });
});
