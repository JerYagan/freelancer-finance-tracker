import { settingsUpdateSchema } from "@/lib/schemas/settings";
import { apiHandler, successResponse } from "@/server/http";
import { getSettings, updateSettings } from "@/server/services/settings";

export const GET = apiHandler(async ({ userId }) => {
  const data = await getSettings(userId);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(settingsUpdateSchema);
  const data = await updateSettings(userId, body);
  return successResponse(data);
});
