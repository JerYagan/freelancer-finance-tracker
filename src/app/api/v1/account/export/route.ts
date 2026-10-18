import { apiHandler, successResponse } from "@/server/http";
import { exportAccountData } from "@/server/services/account";

export const GET = apiHandler(async ({ userId }) => {
  const data = await exportAccountData(userId);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `freelancer-finance-account-export-${dateStr}.json`;

  return successResponse(data, 200, {
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
});
