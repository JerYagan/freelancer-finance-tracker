import { describe, expect, it } from "vitest";

// WCAG 2.1 relative luminance and contrast ratio calculation
function parseHex(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getChannelLuminance(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * getChannelLuminance(r) +
    0.7152 * getChannelLuminance(g) +
    0.0722 * getChannelLuminance(b)
  );
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Accessibility Pass — WCAG AA Contrast Verification", () => {
  describe("Light Mode Token Contrast (Minimum 4.5:1 for body and amounts)", () => {
    const lightSurface = "#ffffff";
    const lightBackground = "#fafaf9";

    it("verifies body text has WCAG AA contrast (>= 4.5:1)", () => {
      const text = "#1c1917";
      const ratioOnSurface = getContrastRatio(text, lightSurface);
      const ratioOnBg = getContrastRatio(text, lightBackground);

      expect(ratioOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(ratioOnBg).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies text-muted has WCAG AA contrast (>= 4.5:1)", () => {
      const textMuted = "#78716c";
      const ratioOnSurface = getContrastRatio(textMuted, lightSurface);
      expect(ratioOnSurface).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies primary action color has WCAG AA contrast", () => {
      const primary = "#0f766e";
      const primaryForeground = "#ffffff";
      const ratio = getContrastRatio(primary, primaryForeground);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies income amount color has WCAG AA contrast (>= 4.5:1)", () => {
      const income = "#15803d";
      const ratio = getContrastRatio(income, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies expense amount color has WCAG AA contrast (>= 4.5:1)", () => {
      const expense = "#b91c1c";
      const ratio = getContrastRatio(expense, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies warning token has WCAG AA contrast (>= 4.5:1)", () => {
      const warning = "#b45309";
      const ratio = getContrastRatio(warning, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Dark Mode Token Contrast (Minimum 4.5:1 for body and amounts)", () => {
    const darkSurface = "#1c1917";
    const darkBackground = "#0c0a09";

    it("verifies dark body text has WCAG AA contrast (>= 4.5:1)", () => {
      const darkText = "#fafaf9";
      const ratioOnSurface = getContrastRatio(darkText, darkSurface);
      const ratioOnBg = getContrastRatio(darkText, darkBackground);

      expect(ratioOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(ratioOnBg).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies dark text-muted has WCAG AA contrast (>= 4.5:1)", () => {
      const darkTextMuted = "#a8a29e";
      const ratioOnSurface = getContrastRatio(darkTextMuted, darkSurface);
      expect(ratioOnSurface).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies dark primary action and foreground contrast", () => {
      const darkPrimary = "#2dd4bf";
      const darkPrimaryForeground = "#042f2e";
      const ratio = getContrastRatio(darkPrimary, darkPrimaryForeground);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies dark income amount has WCAG AA contrast (>= 4.5:1)", () => {
      const darkIncome = "#4ade80";
      const ratio = getContrastRatio(darkIncome, darkSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies dark expense amount has WCAG AA contrast (>= 4.5:1)", () => {
      const darkExpense = "#f87171";
      const ratio = getContrastRatio(darkExpense, darkSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies dark warning token has WCAG AA contrast (>= 4.5:1)", () => {
      const darkWarning = "#fbbf24";
      const ratio = getContrastRatio(darkWarning, darkSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Tally Brand Tokens Contrast Verification", () => {
    const tallyIvory = "#ffffef";
    const tallyCream = "#f3f1e8";
    const tallyPine = "#17211b";
    const tallyDarkBg = "#0e1411";

    it("verifies Pine Charcoal text has excellent contrast on Ivory and Cream (> 10:1)", () => {
      expect(getContrastRatio(tallyPine, tallyIvory)).toBeGreaterThanOrEqual(10);
      expect(getContrastRatio(tallyPine, tallyCream)).toBeGreaterThanOrEqual(10);
    });

    it("verifies dark mode Cream text has excellent contrast on Pine Dark (> 10:1)", () => {
      expect(getContrastRatio(tallyCream, tallyPine)).toBeGreaterThanOrEqual(10);
      expect(getContrastRatio(tallyCream, tallyDarkBg)).toBeGreaterThanOrEqual(10);
    });

    it("verifies Tally income green meets WCAG AA on Ivory (>= 4.5:1)", () => {
      expect(getContrastRatio("#2e7d32", tallyIvory)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
