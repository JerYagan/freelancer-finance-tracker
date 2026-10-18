import { uuidSchema } from "@/lib/schemas/common";
import { receiptUploadRequestSchema } from "@/lib/schemas/receipts";
import { apiHandler, successResponse } from "@/server/http";
import {
  requestReceiptUpload,
  getReceiptDownloadUrl,
  deleteReceipt,
} from "@/server/services/receipts";

export const POST = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(receiptUploadRequestSchema);
  const data = await requestReceiptUpload(userId, id, body);
  return successResponse(data);
});

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getReceiptDownloadUrl(userId, id);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await deleteReceipt(userId, id);
  return successResponse(data);
});
