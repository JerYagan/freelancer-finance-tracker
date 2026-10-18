import { csvPreviewInputSchema } from "@/lib/schemas/import";
import { apiHandler, successResponse } from "@/server/http";
import { previewCsvTransactions } from "@/server/services/import";

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(csvPreviewInputSchema);
  const data = await previewCsvTransactions(userId, body);
  return successResponse(data);
});
