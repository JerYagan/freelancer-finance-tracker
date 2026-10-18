import { csvImportInputSchema } from "@/lib/schemas/import";
import { apiHandler, successResponse } from "@/server/http";
import { importTransactionsFromCsv } from "@/server/services/import";

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(csvImportInputSchema);
  const data = await importTransactionsFromCsv(userId, body);
  return successResponse(data);
});
