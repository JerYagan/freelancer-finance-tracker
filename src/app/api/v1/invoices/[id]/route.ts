import { uuidSchema } from "@/lib/schemas/common";
import { invoiceUpdateSchema } from "@/lib/schemas/invoices";
import { apiHandler, noContentResponse, successResponse } from "@/server/http";
import {
  deleteInvoice,
  getInvoiceById,
  updateInvoice,
} from "@/server/services/invoices";

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getInvoiceById(userId, id);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(invoiceUpdateSchema);
  const data = await updateInvoice(userId, id, body);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  await deleteInvoice(userId, id);
  return noContentResponse();
});
