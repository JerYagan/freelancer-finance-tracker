import {
  transactionCreateSchema,
  transactionQuerySchema,
} from "@/lib/schemas/transactions";
import { apiHandler, listResponse, successResponse } from "@/server/http";
import {
  createTransaction,
  listTransactions,
} from "@/server/services/transactions";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(transactionQuerySchema);
  const result = await listTransactions(userId, query);
  return listResponse(result.data, result.meta);
});

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(transactionCreateSchema);
  const data = await createTransaction(userId, body);
  return successResponse(data, 201);
});
