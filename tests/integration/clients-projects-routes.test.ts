import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module to control active session
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock services to test route layer and tenancy handling
vi.mock("@/server/services/clients", () => ({
  listClients: vi.fn(),
  getClientById: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
}));

vi.mock("@/server/services/projects", () => ({
  listProjects: vi.fn(),
  getProjectById: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import {
  createClient,
  deleteClient,
  getClientById,
  listClients,
  updateClient,
} from "@/server/services/clients";
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject,
} from "@/server/services/projects";
import {
  GET as getClients,
  POST as postClients,
} from "@/app/api/v1/clients/route";
import {
  DELETE as deleteClientById,
  GET as getClientByIdRoute,
  PATCH as patchClientById,
} from "@/app/api/v1/clients/[id]/route";
import {
  GET as getProjects,
  POST as postProjects,
} from "@/app/api/v1/projects/route";
import {
  DELETE as deleteProjectById,
  GET as getProjectByIdRoute,
  PATCH as patchProjectById,
} from "@/app/api/v1/projects/[id]/route";
import { AppError } from "@/server/http";

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

const clientA = {
  id: "123e4567-e89b-12d3-a456-426614174011",
  name: "Acme Corp",
  email: "billing@acme.com",
  notes: null,
  archivedAt: null,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

const projectA = {
  id: "123e4567-e89b-12d3-a456-426614174022",
  name: "Website Redesign",
  clientId: clientA.id,
  clientName: clientA.name,
  archivedAt: null,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Clients & Projects Routes - Tenancy & Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Guard", () => {
    it("returns 401 UNAUTHENTICATED on unauthenticated client requests", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/clients");
      const res = await getClients(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 401 UNAUTHENTICATED on unauthenticated project requests", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/projects");
      const res = await getProjects(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Clients Tenancy", () => {
    it("User B cannot view User A's client by ID (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(getClientById).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === clientA.id) {
          throw AppError.notFound("Client not found");
        }
        return clientA;
      });

      const req = new Request(`http://localhost/api/v1/clients/${clientA.id}`);
      const res = await getClientByIdRoute(req, {
        params: Promise.resolve({ id: clientA.id }),
      });

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
    });

    it("User B cannot update User A's client (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(updateClient).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === clientA.id) {
          throw AppError.notFound("Client not found");
        }
        return clientA;
      });

      const req = new Request(`http://localhost/api/v1/clients/${clientA.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Hacked" }),
      });
      const res = await patchClientById(req, {
        params: Promise.resolve({ id: clientA.id }),
      });

      expect(res.status).toBe(404);
    });

    it("User B cannot delete User A's client (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(deleteClient).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === clientA.id) {
          throw AppError.notFound("Client not found");
        }
      });

      const req = new Request(`http://localhost/api/v1/clients/${clientA.id}`, {
        method: "DELETE",
      });
      const res = await deleteClientById(req, {
        params: Promise.resolve({ id: clientA.id }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Projects Tenancy", () => {
    it("User B cannot view User A's project by ID (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(getProjectById).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === projectA.id) {
          throw AppError.notFound("Project not found");
        }
        return projectA;
      });

      const req = new Request(
        `http://localhost/api/v1/projects/${projectA.id}`,
      );
      const res = await getProjectByIdRoute(req, {
        params: Promise.resolve({ id: projectA.id }),
      });

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
    });

    it("User B cannot update User A's project (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(updateProject).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === projectA.id) {
          throw AppError.notFound("Project not found");
        }
        return projectA;
      });

      const req = new Request(
        `http://localhost/api/v1/projects/${projectA.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Hacked" }),
        },
      );
      const res = await patchProjectById(req, {
        params: Promise.resolve({ id: projectA.id }),
      });

      expect(res.status).toBe(404);
    });

    it("User B cannot delete User A's project (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(deleteProject).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === projectA.id) {
          throw AppError.notFound("Project not found");
        }
      });

      const req = new Request(
        `http://localhost/api/v1/projects/${projectA.id}`,
        {
          method: "DELETE",
        },
      );
      const res = await deleteProjectById(req, {
        params: Promise.resolve({ id: projectA.id }),
      });

      expect(res.status).toBe(404);
    });

    it("User B's client listing is scoped to User B", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(listClients).mockResolvedValue([]);

      const req = new Request("http://localhost/api/v1/clients");
      const res = await getClients(req);

      expect(res.status).toBe(200);
      expect(listClients).toHaveBeenCalledWith("user-b", expect.anything());
    });

    it("User B's project listing is scoped to User B", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(listProjects).mockResolvedValue([]);

      const req = new Request("http://localhost/api/v1/projects");
      const res = await getProjects(req);

      expect(res.status).toBe(200);
      expect(listProjects).toHaveBeenCalledWith("user-b", expect.anything());
    });
  });

  describe("Happy Path & Creation Validations", () => {
    it("POST /api/v1/clients creates client with 201", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(createClient).mockResolvedValue(clientA);

      const req = new Request("http://localhost/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({ name: "Acme Corp", email: "billing@acme.com" }),
      });
      const res = await postClients(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe("Acme Corp");
    });

    it("POST /api/v1/projects creates project with 201", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(createProject).mockResolvedValue(projectA);

      const req = new Request("http://localhost/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Website Redesign",
          clientId: clientA.id,
        }),
      });
      const res = await postProjects(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe("Website Redesign");
    });
  });
});
