import { describe, it, expect } from "vitest";
import nextConfig, { cspHeader, securityHeaders } from "../../next.config";

describe("Security Headers and CSP Review", () => {
  it("configures all mandatory security headers in next.config.ts", async () => {
    expect(nextConfig.headers).toBeDefined();

    if (!nextConfig.headers) {
      throw new Error("headers() function is missing in nextConfig");
    }

    const headerConfigs = await nextConfig.headers();
    expect(headerConfigs).toHaveLength(1);

    const rootRule = headerConfigs[0]!;
    expect(rootRule.source).toBe("/:path*");

    const headerMap = new Map(
      rootRule.headers.map((h: { key: string; value: string }) => [
        h.key.toLowerCase(),
        h.value,
      ]),
    );

    // 1. Content Security Policy
    expect(headerMap.has("content-security-policy")).toBe(true);
    const csp = headerMap.get("content-security-policy")!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("img-src 'self' blob: data:");

    // 2. MIME sniffing prevention
    expect(headerMap.get("x-content-type-options")).toBe("nosniff");

    // 3. Clickjacking defense
    expect(headerMap.get("x-frame-options")).toBe("DENY");

    // 4. Referrer policy
    expect(headerMap.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );

    // 5. Hardware Permissions Policy
    expect(headerMap.get("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );

    // 6. Strict Transport Security (HSTS)
    expect(headerMap.get("strict-transport-security")).toContain(
      "max-age=63072000",
    );
    expect(headerMap.get("strict-transport-security")).toContain(
      "includeSubDomains",
    );
    expect(headerMap.get("strict-transport-security")).toContain("preload");
  });

  it("exports valid cspHeader and securityHeaders arrays", () => {
    expect(cspHeader).toBeTypeOf("string");
    expect(Array.isArray(securityHeaders)).toBe(true);
    expect(securityHeaders.length).toBeGreaterThanOrEqual(6);
  });
});
