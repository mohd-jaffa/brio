import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../../src/features/auth/service";
import { ConflictError } from "../../src/shared/errors/app-error";

describe("AuthService", () => {
  it("rolls back user creation if profile/bakery creation fails", async () => {
    // Mock the admin client to simulate auth success but database failure
    const deleteUserMock = vi.fn().mockResolvedValue({ error: null });
    
    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
          }),
          deleteUser: deleteUserMock,
        },
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "duplicate key value violates unique constraint" }, // Simulate DB error
            }),
          }),
        }),
      }),
    };

    const service = new AuthService({
      createAdminClient: () => mockAdminClient as any,
      createAnonClient: () => ({} as any),
      createMailService: () => ({} as any),
      getEnv: () => ({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" } as any),
    });

    await expect(
      service.register({
        name: "Test Baker",
        businessName: "Test Bakery",
        email: "test@example.com",
        phone: "+919876543210",
        password: "password123",
        confirmPassword: "password123",
      })
    ).rejects.toThrow(ConflictError);

    // Verify compensation ran
    expect(deleteUserMock).toHaveBeenCalledWith("test-user-id");
  });
});
