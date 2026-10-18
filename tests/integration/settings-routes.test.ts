import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock settings service
vi.mock("@/server/services/settings", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import { getSettings, updateSettings } from "@/server/services/settings";
import {
  GET as getSettingsRoute,
  PATCH as patchSettingsRoute,
} from "@/app/api/v1/settings/route";

const userA = {
  id: "user-a",
  name: "User A",
  email: "usera@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userB = {
  id: "user-b",
  name: "User B",
  email: "userb@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const settingsA = {
  userId: "user-a",
  displayName: "Freelancer A",
  defaultCurrency: "PHP",
  taxSetAsideBps: 1500,
  fiscalYearStartMonth: 1,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

const settingsB = {
  userId: "user-b",
  displayName: "Freelancer B",
  defaultCurrency: "USD",
  taxSetAsideBps: 2500,
  fiscalYearStartMonth: 4,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Settings Routes - Authentication & Tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAUTHENTICATED when not logged in", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const getReq = new Request("http://localhost/api/v1/settings", {
      method: "GET",
    });
    const getRes = await getSettingsRoute(getReq);
    expect(getRes.status).toBe(401);
    const getBody = await getRes.json();
    expect(getBody.error.code).toBe("UNAUTHENTICATED");

    const patchReq = new Request("http://localhost/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultCurrency: "USD" }),
    });
    const patchRes = await patchSettingsRoute(patchReq);
    expect(patchRes.status).toBe(401);
    const patchBody = await patchRes.json();
    expect(patchBody.error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/v1/settings returns settings scoped to authenticated user A", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userA);
    vi.mocked(getSettings).mockResolvedValue(settingsA);

    const req = new Request("http://localhost/api/v1/settings", {
      method: "GET",
    });
    const res = await getSettingsRoute(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(settingsA);
    expect(getSettings).toHaveBeenCalledWith(userA.id);
  });

  it("GET /api/v1/settings returns settings scoped to authenticated user B (tenancy isolation)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userB);
    vi.mocked(getSettings).mockResolvedValue(settingsB);

    const req = new Request("http://localhost/api/v1/settings", {
      method: "GET",
    });
    const res = await getSettingsRoute(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(settingsB);
    expect(getSettings).toHaveBeenCalledWith(userB.id);
  });

  it("PATCH /api/v1/settings updates settings scoped to authenticated user", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userA);
    const updatedSettings = {
      ...settingsA,
      taxSetAsideBps: 2000,
      defaultCurrency: "USD",
    };
    vi.mocked(updateSettings).mockResolvedValue(updatedSettings);

    const req = new Request("http://localhost/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxSetAsideBps: 2000,
        defaultCurrency: "USD",
      }),
    });
    const res = await patchSettingsRoute(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(updatedSettings);
    expect(updateSettings).toHaveBeenCalledWith(userA.id, {
      taxSetAsideBps: 2000,
      defaultCurrency: "USD",
    });
  });

  it("PATCH /api/v1/settings rejects invalid fields (400 VALIDATION_ERROR)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userA);

    // Test taxSetAsideBps > 10000
    const req1 = new Request("http://localhost/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxSetAsideBps: 15000 }),
    });
    const res1 = await patchSettingsRoute(req1);
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.error.code).toBe("VALIDATION_ERROR");
    expect(body1.error.fields.taxSetAsideBps).toBeDefined();

    // Test fiscalYearStartMonth > 12
    const req2 = new Request("http://localhost/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscalYearStartMonth: 13 }),
    });
    const res2 = await patchSettingsRoute(req2);
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.error.code).toBe("VALIDATION_ERROR");
    expect(body2.error.fields.fiscalYearStartMonth).toBeDefined();

    // Test invalid currency
    const req3 = new Request("http://localhost/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultCurrency: "INVALID" }),
    });
    const res3 = await patchSettingsRoute(req3);
    expect(res3.status).toBe(400);
    const body3 = await res3.json();
    expect(body3.error.code).toBe("VALIDATION_ERROR");
  });
});
