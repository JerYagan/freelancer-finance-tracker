import { reportsTaxSummaryQuerySchema } from "@/lib/schemas/reports";
import { apiHandler, successResponse } from "@/server/http";
import { getQuarterlyTaxSummary } from "@/server/services/reports";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(reportsTaxSummaryQuerySchema);
  const data = await getQuarterlyTaxSummary(userId, query);
  return successResponse(data);
});
