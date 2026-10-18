import { describe, it, expect } from "vitest";
import { auth } from "@/server/auth";

describe("Better Auth Rate Limiting Configuration", () => {
  it("defines rate limiting rules for sensitive auth endpoints", () => {
    const rateLimitConfig = auth.options.rateLimit;
    expect(rateLimitConfig).toBeDefined();

    expect(rateLimitConfig.window).toBe(60);
    expect(rateLimitConfig.max).toBe(100);
    expect(rateLimitConfig.storage).toBe("memory");

    const customRules = rateLimitConfig.customRules;
    expect(customRules).toBeDefined();

    // Verify rate limit rules for sensitive endpoints
    expect(customRules["/sign-in/*"]).toEqual({ window: 60, max: 10 });
    expect(customRules["/sign-up/*"]).toEqual({ window: 60, max: 5 });
    expect(customRules["/forget-password"]).toEqual({ window: 60, max: 5 });
    expect(customRules["/reset-password"]).toEqual({ window: 60, max: 5 });
    expect(customRules["/send-verification-email"]).toEqual({
      window: 60,
      max: 5,
    });
  });
});
