import { transactionUpdateSchema } from "@/lib/schemas/transactions";
import { uuidSchema } from "@/lib/schemas/common";
import { apiHandler, noContentResponse, successResponse } from "@/server/http";
import {
  deleteTransaction,
  getTransactionById,
  updateTransaction,
} from "@/server/services/transactions";

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getTransactionById(userId, id);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(transactionUpdateSchema);
  const data = await updateTransaction(userId, id, body);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  await deleteTransaction(userId, id);
  return noContentResponse();
});
