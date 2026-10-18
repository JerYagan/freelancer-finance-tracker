import { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/server/env";
import { AppError, errorResponse, successResponse } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { purgeSoftDeletedRows } from "@/server/services/purge";

const purgeQuerySchema = z.object({
  olderThanDays: z.coerce.number().int().min(1).max(365).default(30),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization: check CRON_SECRET if configured, otherwise require active session
    if (env.CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (bearerToken !== env.CRON_SECRET) {
        throw AppError.unauthenticated(
          "Invalid or missing maintenance authorization",
        );
      }
    } else {
      // In development / absence of CRON_SECRET, allow authenticated users
      const user = await getSessionUser();
      if (!user && env.NODE_ENV === "production") {
        throw AppError.unauthenticated(
          "Authentication required for maintenance endpoints",
        );
      }
    }

    // 2. Parse options if provided
    let olderThanDays = 30;
    try {
      const body = (await request.json().catch(() => ({}))) as unknown;
      if (body && typeof body === "object") {
        const parsed = purgeQuerySchema.safeParse(body);
        if (parsed.success) {
          olderThanDays = parsed.data.olderThanDays;
        }
      }
    } catch {
      // Use default 30
    }

    // 3. Execute purge
    const result = await purgeSoftDeletedRows({ olderThanDays });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
