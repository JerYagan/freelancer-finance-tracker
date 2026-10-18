import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock invoices service
vi.mock("@/server/services/invoices", () => ({
  listInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  markInvoicePaid: vi.fn(),
  deleteInvoice: vi.fn(),
}));

import { getSessionUser, type User } from "@/server/auth";
import {
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  listInvoices,
  markInvoicePaid,
  updateInvoice,
} from "@/server/services/invoices";
import {
  GET as getInvoices,
  POST as postInvoices,
} from "@/app/api/v1/invoices/route";
import {
  DELETE as deleteInvoiceById,
  GET as getInvoiceByIdRoute,
  PATCH as patchInvoiceById,
} from "@/app/api/v1/invoices/[id]/route";
import { POST as postMarkPaid } from "@/app/api/v1/invoices/[id]/mark-paid/route";
import { AppError } from "@/server/http";

const userA: User = {
  id: "user-a",
  name: "User A",
  email: "usera@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userB: User = {
  id: "user-b",
  name: "User B",
  email: "userb@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockInvoice = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  number: "INV-2026-001",
  amountMinor: 2500000,
  currency: "PHP",
  status: "draft" as const,
  derivedStatus: "draft" as const,
  issuedOn: "2026-10-18",
  dueOn: "2026-11-01",
  paidOn: null,
  client: { id: "123e4567-e89b-12d3-a456-426614174001", name: "Acme Corp" },
  project: null,
  category: null,
  notes: null,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Invoices API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Guard", () => {
    it("returns 401 UNAUTHENTICATED when no session exists", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/invoices");
      const res = await getInvoices(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Tenancy Isolation", () => {
    it("passes active user ID to listInvoices", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(listInvoices).mockResolvedValue({
        data: [mockInvoice],
        meta: { nextCursor: null, limit: 50 },
      });

      const req = new Request("http://localhost/api/v1/invoices?status=draft");
      const res = await getInvoices(req);

      expect(res.status).toBe(200);
      expect(listInvoices).toHaveBeenCalledWith(
        "user-a",
        expect.objectContaining({ status: "draft" }),
      );
    });

    it("prevents User B from accessing User A's invoice (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(getInvoiceById).mockRejectedValue(
        AppError.notFound("Invoice not found"),
      );

      const req = new Request(
        `http://localhost/api/v1/invoices/${mockInvoice.id}`,
      );
      const res = await getInvoiceByIdRoute(req, {
        params: Promise.resolve({ id: mockInvoice.id }),
      });

      expect(res.status).toBe(404);
      expect(getInvoiceById).toHaveBeenCalledWith("user-b", mockInvoice.id);
    });

    it("prevents User B from updating, marking paid, or deleting User A's invoice", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(updateInvoice).mockRejectedValue(
        AppError.notFound("Invoice not found"),
      );
      vi.mocked(markInvoicePaid).mockRejectedValue(
        AppError.notFound("Invoice not found"),
      );
      vi.mocked(deleteInvoice).mockRejectedValue(
        AppError.notFound("Invoice not found"),
      );

      const patchReq = new Request(
        `http://localhost/api/v1/invoices/${mockInvoice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: "Malicious update" }),
        },
      );
      const patchRes = await patchInvoiceById(patchReq, {
        params: Promise.resolve({ id: mockInvoice.id }),
      });
      expect(patchRes.status).toBe(404);

      const markPaidReq = new Request(
        `http://localhost/api/v1/invoices/${mockInvoice.id}/mark-paid`,
        { method: "POST" },
      );
      const markPaidRes = await postMarkPaid(markPaidReq, {
        params: Promise.resolve({ id: mockInvoice.id }),
      });
      expect(markPaidRes.status).toBe(404);

      const deleteReq = new Request(
        `http://localhost/api/v1/invoices/${mockInvoice.id}`,
        { method: "DELETE" },
      );
      const deleteRes = await deleteInvoiceById(deleteReq, {
        params: Promise.resolve({ id: mockInvoice.id }),
      });
      expect(deleteRes.status).toBe(404);
    });
  });

  describe("CRUD & Mark-Paid Endpoints", () => {
    it("POST /api/v1/invoices creates invoice and returns 201", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(createInvoice).mockResolvedValue(mockInvoice);

      const req = new Request("http://localhost/api/v1/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: mockInvoice.client.id,
          number: "INV-2026-001",
          amountMinor: 2500000,
          issuedOn: "2026-10-18",
          dueOn: "2026-11-01",
        }),
      });

      const res = await postInvoices(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe(mockInvoice.id);
      expect(createInvoice).toHaveBeenCalledWith(
        "user-a",
        expect.objectContaining({ number: "INV-2026-001" }),
      );
    });

    it("POST /api/v1/invoices/:id/mark-paid transitions invoice and returns 200", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      const paidInvoice = {
        ...mockInvoice,
        status: "paid" as const,
        derivedStatus: "paid" as const,
        paidOn: "2026-10-18",
      };
      vi.mocked(markInvoicePaid).mockResolvedValue(paidInvoice);

      const req = new Request(
        `http://localhost/api/v1/invoices/${mockInvoice.id}/mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paidOn: "2026-10-18" }),
        },
      );

      const res = await postMarkPaid(req, {
        params: Promise.resolve({ id: mockInvoice.id }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("paid");
      expect(markInvoicePaid).toHaveBeenCalledWith("user-a", mockInvoice.id, {
        paidOn: "2026-10-18",
      });
    });

    it("DELETE /api/v1/invoices/:id deletes invoice and returns 204", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(deleteInvoice).mockResolvedValue({
        id: mockInvoice.id,
        deleted: true,
      });

      const req = new Request(
        `http://localhost/api/v1/invoices/${mockInvoice.id}`,
        {
          method: "DELETE",
        },
      );

      const res = await deleteInvoiceById(req, {
        params: Promise.resolve({ id: mockInvoice.id }),
      });

      expect(res.status).toBe(204);
      expect(deleteInvoice).toHaveBeenCalledWith("user-a", mockInvoice.id);
    });
  });
});
