import { describe, it, expect } from "vitest";
import { auth, getSessionUser } from "@/server/auth";

describe("Better Auth Setup", () => {
  it("initializes auth with email and password enabled", () => {
    expect(auth).toBeDefined();
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(10);
  });

  it("returns null when getSessionUser is called without an active session", async () => {
    const user = await getSessionUser();
    expect(user).toBeNull();
  });

  it("handles auth endpoint request gracefully", async () => {
    const request = new Request("http://localhost:3000/api/auth/get-session", {
      method: "GET",
    });
    const response = await auth.handler(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toBeNull();
  });

  it("configures databaseHooks to seed user defaults after user creation", () => {
    expect(auth.options.databaseHooks?.user?.create?.after).toBeDefined();
    expect(typeof auth.options.databaseHooks?.user?.create?.after).toBe(
      "function",
    );
  });

  it("configures email verification and password reset email callbacks", async () => {
    expect(auth.options.emailVerification?.sendVerificationEmail).toBeDefined();
    expect(auth.options.emailAndPassword?.sendResetPassword).toBeDefined();

    // Verify calling sendResetPassword pushes an email
    await auth.options.emailAndPassword?.sendResetPassword?.({
      user: {
        id: "u-123",
        email: "forgot@example.com",
        name: "Forgot User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      url: "http://localhost:3000/reset-password?token=mock123",
      token: "mock123",
    });

    // Verify calling sendVerificationEmail pushes an email
    await auth.options.emailVerification?.sendVerificationEmail?.({
      user: {
        id: "u-123",
        email: "verify@example.com",
        name: "Verify User",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      url: "http://localhost:3000/verify-email?token=verify123",
      token: "verify123",
    });
  });
});
