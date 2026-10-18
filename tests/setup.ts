import "@testing-library/jest-dom/vitest";

try {
  process.loadEnvFile(".env.local");
} catch {
  // In environments without .env.local
}

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://user:password@localhost:5432/freelancer_finance_test";
process.env.DATABASE_URL_UNPOOLED =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  "test_secret_32_characters_minimum_length_for_vitest";
process.env.BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "PHP";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
