import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Job } from "@/lib/jobs/types";

const registerJobHandler = vi.hoisted(() => vi.fn());
vi.mock("@/lib/jobs/queue", () => ({ registerJobHandler }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { registerAnalyticsWorker } from "@/features/analytics/worker";

beforeEach(() => vi.clearAllMocks());

describe("the analytics worker", () => {
  it("handles a refresh for the business it names, and refuses one that names none", async () => {
    registerAnalyticsWorker();
    const [type, handle] = registerJobHandler.mock.calls[0] as [string, (job: Job) => Promise<void>];
    expect(type).toBe("REFRESH_ANALYTICS");

    await expect(handle({ id: "j-1", payload: { bakeryId: "b-1" } } as unknown as Job)).resolves.toBeUndefined();
    await expect(handle({ id: "j-2", payload: {} } as unknown as Job)).rejects.toThrow(/bakeryId/);
  });
});
