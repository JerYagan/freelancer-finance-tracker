import { recurringGenerateSchema } from "@/lib/schemas/recurring";
import { apiHandler, successResponse } from "@/server/http";
import { generateDueRecurringTransactions } from "@/server/services/recurring";

export const POST = apiHandler(async ({ userId, request, parseQuery }) => {
  let throughDate: string | undefined;

  const query = parseQuery(recurringGenerateSchema);
  if (query.throughDate) {
    throughDate = query.throughDate;
  } else {
    try {
      const text = await request.text();
      if (text) {
        const json = JSON.parse(text);
        const parsed = recurringGenerateSchema.safeParse(json);
        if (parsed.success && parsed.data.throughDate) {
          throughDate = parsed.data.throughDate;
        }
      }
    } catch {
      // Body is empty or not JSON, throughDate stays undefined (defaults to today)
    }
  }

  const result = await generateDueRecurringTransactions(userId, throughDate);
  return successResponse(result);
});
