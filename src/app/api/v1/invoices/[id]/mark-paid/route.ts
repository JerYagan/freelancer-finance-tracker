import { uuidSchema } from "@/lib/schemas/common";
import { invoiceMarkPaidSchema } from "@/lib/schemas/invoices";
import { apiHandler, successResponse } from "@/server/http";
import { markInvoicePaid } from "@/server/services/invoices";

export const POST = apiHandler(async ({ userId, params, request }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);

  let paidOn: string | undefined;
  try {
    const text = await request.text();
    if (text) {
      const json = JSON.parse(text);
      const parsed = invoiceMarkPaidSchema.safeParse(json);
      if (parsed.success && parsed.data.paidOn) {
        paidOn = parsed.data.paidOn;
      }
    }
  } catch {
    // Body is optional/empty, paidOn defaults to today
  }

  const data = await markInvoicePaid(userId, id, { paidOn });
  return successResponse(data);
});
