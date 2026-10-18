import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  clearSentEmails,
  getSentEmails,
} from "@/server/services/email";
import * as envModule from "@/server/env";

describe("Email Service", () => {
  beforeEach(() => {
    clearSentEmails();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearSentEmails();
  });

  it("sends mock verification email and stores in buffer", async () => {
    const result = await sendVerificationEmail({
      to: "freelancer@example.com",
      name: "Alex Designer",
      verificationUrl:
        "http://localhost:3000/verify-email?token=test-verify-token",
    });

    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^mock-/);

    const sent = getSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("freelancer@example.com");
    expect(sent[0]?.subject).toBe(
      "Verify your Tally account",
    );
    expect(sent[0]?.html).toContain("Alex Designer");
    expect(sent[0]?.html).toContain(
      "http://localhost:3000/verify-email?token=test-verify-token",
    );
    expect(sent[0]?.text).toContain("Alex Designer");
    expect(sent[0]?.text).toContain(
      "http://localhost:3000/verify-email?token=test-verify-token",
    );
  });

  it("sends mock password reset email with disclaimer", async () => {
    const result = await sendPasswordResetEmail({
      to: "dev@example.com",
      name: "Taylor Dev",
      resetUrl: "http://localhost:3000/reset-password?token=test-reset-token",
    });

    expect(result.success).toBe(true);

    const sent = getSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("dev@example.com");
    expect(sent[0]?.subject).toBe(
      "Reset your Tally password",
    );
    expect(sent[0]?.html).toContain("Taylor Dev");
    expect(sent[0]?.html).toContain(
      "http://localhost:3000/reset-password?token=test-reset-token",
    );
    expect(sent[0]?.text).toContain(
      "If you did not request a password reset, please ignore this email",
    );
  });

  it("handles fallback recipient greeting when name is null or undefined", async () => {
    await sendVerificationEmail({
      to: "noname@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=abc",
    });

    const sent = getSentEmails();
    expect(sent[0]?.html).toContain("Hello <strong>there</strong>");
    expect(sent[0]?.text).toContain("Hello there");
  });

  it("clears sent emails buffer when requested", async () => {
    await sendPasswordResetEmail({
      to: "user@example.com",
      resetUrl: "http://localhost:3000/reset-password?token=123",
    });

    expect(getSentEmails()).toHaveLength(1);
    clearSentEmails();
    expect(getSentEmails()).toHaveLength(0);
  });

  it("calls Resend REST API when RESEND_API_KEY is configured", async () => {
    const originalEnv = envModule.env;
    // Mock env to include RESEND_API_KEY
    vi.spyOn(envModule, "env", "get").mockReturnValue({
      ...originalEnv,
      RESEND_API_KEY: "re_mock_test_key_12345",
      EMAIL_FROM: "Acme Finance <noreply@acme.com>",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "resend-msg-999" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({
      to: "client@example.com",
      subject: "Test Resend",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("resend-msg-999");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer re_mock_test_key_12345",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("throws descriptive error when Resend API returns non-2xx response", async () => {
    const originalEnv = envModule.env;
    vi.spyOn(envModule, "env", "get").mockReturnValue({
      ...originalEnv,
      RESEND_API_KEY: "re_mock_invalid",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Invalid API Key",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEmail({
        to: "fail@example.com",
        subject: "Failure Test",
        html: "<p>Fail</p>",
        text: "Fail",
      }),
    ).rejects.toThrow("Failed to send email: 401 Unauthorized");
  });
});
