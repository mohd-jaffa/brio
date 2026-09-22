import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { NotificationWorker } from "@/features/notifications/worker";
import { WorkerService } from "@/features/workers/service";
import { type Job } from "@/features/workers/types";
import { CapacitorPushProvider } from "@/features/notifications/capacitor-push.service";

vi.mock("@/features/workers/service");
vi.mock("@/features/notifications/capacitor-push.service");

describe("NotificationWorker", () => {
  let workerService: Mocked<WorkerService>;
  let notificationWorker: NotificationWorker;
  let pushProviderMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    workerService = new WorkerService({} as any) as any;
    pushProviderMock = {
      sendPush: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(true),
    };
    CapacitorPushProvider.prototype.sendPush = pushProviderMock.sendPush;
    CapacitorPushProvider.prototype.requestPermissions = pushProviderMock.requestPermissions;

    notificationWorker = new NotificationWorker(workerService);
  });

  it("should register SEND_PUSH_NOTIFICATION handler", () => {
    notificationWorker.register();
    expect(workerService.registerHandler).toHaveBeenCalledWith(
      "SEND_PUSH_NOTIFICATION",
      expect.any(Function)
    );
  });

  it("should process push notification job successfully", async () => {
    notificationWorker.register();
    const handler = vi.mocked(workerService.registerHandler).mock.calls[0][1];

    const job: Job = {
      id: "job-1",
      type: "SEND_PUSH_NOTIFICATION",
      payload: { token: "token-123", payload: { title: "Test", body: "Message" } },
      status: "processing",
      attempts: 1,
      run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker",
      last_error: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    await handler(job);

    expect(pushProviderMock.sendPush).toHaveBeenCalledWith("token-123", { title: "Test", body: "Message" });
  });

  it("should throw error if payload is missing token", async () => {
    notificationWorker.register();
    const handler = vi.mocked(workerService.registerHandler).mock.calls[0][1];

    const job: Job = {
      id: "job-2",
      type: "SEND_PUSH_NOTIFICATION",
      payload: { payload: { title: "Test" } }, // missing token
      status: "processing",
      attempts: 1,
      run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker",
      last_error: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    await expect(handler(job)).rejects.toThrow("Invalid push notification job payload: missing token or payload");
  });
});
