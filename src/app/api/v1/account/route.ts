import { accountDeleteSchema } from "@/lib/schemas/account";
import { apiHandler, successResponse } from "@/server/http";
import { deleteUserAccount } from "@/server/services/account";

export const DELETE = apiHandler(async ({ userId, parseBody }) => {
  await parseBody(accountDeleteSchema);
  const result = await deleteUserAccount(userId);
  return successResponse(result);
});
