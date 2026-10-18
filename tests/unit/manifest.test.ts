import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";

describe("Web App Manifest Unit Tests", () => {
  it("generates a valid PWA manifest matching requirements", () => {
    const data = manifest();

    expect(data.name).toBe("Tally — Freelance Finances, Simplified");
    expect(data.short_name).toBe("Tally");
    expect(data.start_url).toBe("/dashboard");
    expect(data.display).toBe("standalone");
    expect(data.background_color).toBe("#f3f1e8");
    expect(data.theme_color).toBe("#5e8c61");

    expect(data.icons).toBeDefined();
    expect(data.icons!.length).toBeGreaterThanOrEqual(3);

    const sizes = data.icons!.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");

    expect(data.shortcuts).toBeDefined();
    const shortcutUrls = data.shortcuts!.map((s) => s.url);
    expect(shortcutUrls).toContain("/transactions?action=new");
  });
});
