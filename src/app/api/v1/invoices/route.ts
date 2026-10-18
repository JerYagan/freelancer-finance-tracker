import {
  invoiceCreateSchema,
  invoiceQuerySchema,
} from "@/lib/schemas/invoices";
import { apiHandler, listResponse, successResponse } from "@/server/http";
import { createInvoice, listInvoices } from "@/server/services/invoices";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(invoiceQuerySchema);
  const result = await listInvoices(userId, query);
  return listResponse(result.data, result.meta);
});

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(invoiceCreateSchema);
  const data = await createInvoice(userId, body);
  return successResponse(data, 201);
});
