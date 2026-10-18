import { env } from "@/server/env";

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface SanitizedErrorInfo {
  eventId: string;
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  context: ErrorContext;
}

/**
 * Strips database connection strings, auth tokens, passwords, and secret keys from strings.
 */
export function sanitizeMessage(raw: string): string {
  if (!raw) return "";
  return (
    raw
      // PostgreSQL/database connection URIs with passwords
      .replace(
        /postgres(?:ql)?:\/\/[^@\s]+@[^\s]+/gi,
        "postgres://[REDACTED_CREDENTIALS]@[HOST]",
      )
      // Bearer / Auth tokens
      .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer [REDACTED]")
      // Session / secret strings
      .replace(/(?:password|secret|key|token)=["']?[^"'\s&]+/gi, (match) => {
        const [key] = match.split("=");
        return `${key}=[REDACTED]`;
      })
  );
}

/**
 * Sanitizes object dictionaries ensuring sensitive keys are redacted.
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitivePattern =
    /password|secret|token|authorization|cookie|session|key/i;

  for (const [k, v] of Object.entries(obj)) {
    if (sensitivePattern.test(k)) {
      sanitized[k] = "[REDACTED]";
    } else if (typeof v === "string") {
      sanitized[k] = sanitizeMessage(v);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      sanitized[k] = sanitizeObject(v as Record<string, unknown>);
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}

/**
 * Normalizes any caught item (Error instance, string, or unknown) into a structured SanitizedErrorInfo.
 */
export function normalizeError(
  error: unknown,
  context: ErrorContext = {},
): SanitizedErrorInfo {
  const eventId = context.requestId || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  let name = "Error";
  let rawMessage = "An unknown error occurred";
  let stack: string | undefined;

  if (error instanceof Error) {
    name = error.name || "Error";
    rawMessage = error.message || "";
    stack = error.stack;
  } else if (typeof error === "string") {
    rawMessage = error;
  } else if (error && typeof error === "object") {
    rawMessage = JSON.stringify(error);
  }

  const message = sanitizeMessage(rawMessage);
  const cleanStack = stack ? sanitizeMessage(stack) : undefined;

  const sanitizedContext: ErrorContext = {
    requestId: eventId,
    userId: context.userId,
    route: context.route,
    method: context.method,
    tags: context.tags
      ? (sanitizeObject(context.tags) as Record<string, string>)
      : undefined,
    extra: context.extra ? sanitizeObject(context.extra) : undefined,
  };

  return {
    eventId,
    timestamp,
    name,
    message,
    stack: cleanStack,
    context: sanitizedContext,
  };
}

/**
 * Dispatches an error payload to Sentry over standard HTTPS ingest without external SDKs.
 */
async function sendToSentry(
  dsn: string,
  info: SanitizedErrorInfo,
): Promise<void> {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\//, "");

    if (!publicKey || !projectId) {
      console.warn(
        "[Monitoring] Malformed SENTRY_DSN provided; skipping remote dispatch.",
      );
      return;
    }

    const endpoint = `https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(
      publicKey,
    )}&sentry_client=fft-native/1.0.0`;

    const payload = {
      event_id: info.eventId.replace(/-/g, ""),
      timestamp: info.timestamp,
      platform: "javascript",
      level: "error",
      logger: "server",
      environment: env.NODE_ENV,
      exception: {
        values: [
          {
            type: info.name,
            value: info.message,
            stacktrace: info.stack
              ? {
                  frames: info.stack.split("\n").map((line) => ({
                    function: line.trim(),
                  })),
                }
              : undefined,
          },
        ],
      },
      tags: {
        requestId: info.eventId,
        ...(info.context.route ? { route: info.context.route } : {}),
        ...(info.context.method ? { method: info.context.method } : {}),
        ...info.context.tags,
      },
      user: info.context.userId ? { id: info.context.userId } : undefined,
      extra: info.context.extra,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn(
        `[Monitoring] Sentry ingest responded with HTTP ${res.status}`,
      );
    }
  } catch (err) {
    // Non-blocking: never let monitoring failure crash the application
    console.warn("[Monitoring] Failed to send error event to Sentry:", err);
  }
}

/**
 * Primary exception capture function for server route handlers, services, and boundaries.
 * Logs locally with structured metadata and forwards to Sentry if SENTRY_DSN is configured.
 */
export async function captureException(
  error: unknown,
  context: ErrorContext = {},
): Promise<string> {
  const info = normalizeError(error, context);

  // Structured local error output
  console.error(
    `[Monitoring] [Event: ${info.eventId}] [${info.name}] ${info.message}`,
    JSON.stringify({
      timestamp: info.timestamp,
      context: info.context,
      stack: info.stack,
    }),
  );

  if (env.SENTRY_DSN && env.NODE_ENV !== "test") {
    // Fire-and-forget remote dispatch
    void sendToSentry(env.SENTRY_DSN, info);
  }

  return info.eventId;
}
