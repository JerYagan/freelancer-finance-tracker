import { describe, it, expect, vi } from "vitest";
import {
  createClient,
  deleteClient,
  getClientById,
  listClients,
  toClientDto,
  updateClient,
} from "@/server/services/clients";
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  toProjectDto,
  updateProject,
} from "@/server/services/projects";
import { AppError } from "@/server/http";

describe("Clients Service", () => {
  const userId = "user-alice";
  const clientId = "123e4567-e89b-12d3-a456-426614174010";
  const now = new Date("2026-10-18T10:00:00.000Z");

  const sampleClient = {
    id: clientId,
    userId,
    name: "Acme Corp",
    email: "billing@acme.com",
    notes: "Net-30 payment terms",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  it("toClientDto maps DB row to DTO", () => {
    const dto = toClientDto(sampleClient);
    expect(dto).toEqual({
      id: clientId,
      name: "Acme Corp",
      email: "billing@acme.com",
      notes: "Net-30 payment terms",
      archivedAt: null,
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-18T10:00:00.000Z",
    });
  });

  it("listClients queries active clients by default", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([sampleClient]),
          }),
        }),
      }),
    };

    const res = await listClients(
      userId,
      { includeArchived: false },
      mockDb as unknown as Parameters<typeof listClients>[2],
    );

    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe("Acme Corp");
  });

  it("getClientById throws 404 when not found", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    await expect(
      getClientById(
        userId,
        clientId,
        mockDb as unknown as Parameters<typeof getClientById>[2],
      ),
    ).rejects.toThrow(AppError);
  });

  it("createClient throws 409 CONFLICT on duplicate active name", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-client" }]),
          }),
        }),
      }),
    };

    await expect(
      createClient(
        userId,
        { name: "Acme Corp" },
        mockDb as unknown as Parameters<typeof createClient>[2],
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("deleteClient throws 409 if client has associated projects", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: clientId }]) // Found client
              .mockResolvedValueOnce([{ id: "proj-1" }]), // Found associated project
          }),
        }),
      }),
    };

    await expect(
      deleteClient(
        userId,
        clientId,
        mockDb as unknown as Parameters<typeof deleteClient>[2],
      ),
    ).rejects.toThrow(/associated projects/);
  });

  it("deleteClient throws 409 if client has associated transactions", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: clientId }]) // Found client
              .mockResolvedValueOnce([]) // No projects
              .mockResolvedValueOnce([{ id: "tx-1" }]), // Found associated transaction
          }),
        }),
      }),
    };

    await expect(
      deleteClient(
        userId,
        clientId,
        mockDb as unknown as Parameters<typeof deleteClient>[2],
      ),
    ).rejects.toThrow(/existing transactions/);
  });

  it("updateClient updates fields and checks active duplicate collision", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([sampleClient]) // Found client
              .mockResolvedValueOnce([{ id: "other-client" }]), // Duplicate collision
          }),
        }),
      }),
    };

    await expect(
      updateClient(
        userId,
        clientId,
        { name: "Other Active Client" },
        mockDb as unknown as Parameters<typeof updateClient>[3],
      ),
    ).rejects.toThrow(/already exists/);
  });
});

describe("Projects Service", () => {
  const userId = "user-alice";
  const clientId = "123e4567-e89b-12d3-a456-426614174010";
  const projectId = "123e4567-e89b-12d3-a456-426614174020";
  const now = new Date("2026-10-18T10:00:00.000Z");

  const sampleProject = {
    id: projectId,
    userId,
    clientId,
    name: "Brand Refresh",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  it("toProjectDto maps DB row and joins clientName", () => {
    const dto = toProjectDto(sampleProject, "Acme Corp");
    expect(dto).toEqual({
      id: projectId,
      name: "Brand Refresh",
      clientId,
      clientName: "Acme Corp",
      archivedAt: null,
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-18T10:00:00.000Z",
    });
  });

  it("listProjects queries projects and joins client names", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  project: sampleProject,
                  clientName: "Acme Corp",
                },
              ]),
            }),
          }),
        }),
      }),
    };

    const res = await listProjects(
      userId,
      { includeArchived: false },
      mockDb as unknown as Parameters<typeof listProjects>[2],
    );

    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe("Brand Refresh");
    expect(res[0]?.clientName).toBe("Acme Corp");
  });

  it("getProjectById retrieves single project", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  project: sampleProject,
                  clientName: "Acme Corp",
                },
              ]),
            }),
          }),
        }),
      }),
    };

    const res = await getProjectById(
      userId,
      projectId,
      mockDb as unknown as Parameters<typeof getProjectById>[2],
    );

    expect(res.id).toBe(projectId);
    expect(res.name).toBe("Brand Refresh");
  });

  it("createProject rejects assignment to an archived client", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: clientId,
                name: "Old Client",
                archivedAt: new Date(), // Client is archived!
              },
            ]),
          }),
        }),
      }),
    };

    await expect(
      createProject(
        userId,
        { name: "Website", clientId },
        mockDb as unknown as Parameters<typeof createProject>[2],
      ),
    ).rejects.toThrow(/archived client/);
  });

  it("createProject succeeds for personal projects without clientId", async () => {
    const personalProject = {
      ...sampleProject,
      clientId: null,
      name: "Side Project",
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([personalProject]),
        }),
      }),
    };

    const res = await createProject(
      userId,
      { name: "Side Project", clientId: null },
      mockDb as unknown as Parameters<typeof createProject>[2],
    );

    expect(res.name).toBe("Side Project");
    expect(res.clientId).toBeNull();
  });

  it("updateProject updates fields successfully", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([sampleProject]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...sampleProject,
                name: "Updated Name",
              },
            ]),
          }),
        }),
      }),
    };

    const res = await updateProject(
      userId,
      projectId,
      { name: "Updated Name" },
      mockDb as unknown as Parameters<typeof updateProject>[3],
    );

    expect(res.name).toBe("Updated Name");
  });

  it("deleteProject throws 409 if transactions reference the project", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: projectId }]) // Found project
              .mockResolvedValueOnce([{ id: "tx-10" }]), // Transaction exists
          }),
        }),
      }),
    };

    await expect(
      deleteProject(
        userId,
        projectId,
        mockDb as unknown as Parameters<typeof deleteProject>[2],
      ),
    ).rejects.toThrow(/Archive it instead/);
  });
});
