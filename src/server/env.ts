import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  DEFAULT_CURRENCY: z.string().length(3).default("PHP"),

  // Email configuration (Phase 4)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .default(
      "Freelancer Finance Tracker <noreply@freelancerfinancetracker.com>",
    ),
  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  // Phase 4 optional configurations
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${errorDetails}\nPlease check your .env.local file.`,
    );
  }

  return result.data;
}

export const env = parseEnv();
