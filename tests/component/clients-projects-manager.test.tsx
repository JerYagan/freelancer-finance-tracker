import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClientsProjectsManager } from "@/components/features/clients-projects-manager";
import { ToastContextProvider } from "@/components/ui/toast";
import type { ClientDto } from "@/lib/schemas/clients";
import type { ProjectDto } from "@/lib/schemas/projects";

const mockClients: ClientDto[] = [
  {
    id: "client-1",
    name: "Acme Corp",
    email: "billing@acme.com",
    notes: "Net 30 terms",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

const mockProjects: ProjectDto[] = [
  {
    id: "proj-1",
    name: "Website Redesign",
    clientId: "client-1",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

describe("ClientsProjectsManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/clients")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockClients }),
        });
      }
      if (url.includes("/api/v1/projects")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockProjects }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it("renders clients tab by default and switches to projects tab", async () => {
    render(
      <ToastContextProvider>
        <ClientsProjectsManager />
      </ToastContextProvider>,
    );

    // Clients tab is default
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("billing@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Net 30 terms")).toBeInTheDocument();

    // Click Projects tab
    fireEvent.click(screen.getByRole("button", { name: /projects/i }));

    expect(await screen.findByText("Website Redesign")).toBeInTheDocument();
  });

  it("shows 409 conflict fallback dialog when trying to delete client with projects/transactions", async () => {
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () =>
              Promise.resolve({
                error: {
                  code: "CONFLICT",
                  message: "Client is in use by transactions. Archive instead.",
                },
              }),
          });
        }
        if (url.includes("/api/v1/clients")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockClients }),
          });
        }
        if (url.includes("/api/v1/projects")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockProjects }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

    render(
      <ToastContextProvider>
        <ClientsProjectsManager />
      </ToastContextProvider>,
    );

    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete acme corp/i });
    fireEvent.click(deleteBtn);

    // Fallback modal opens
    expect(await screen.findByText("Item In Use")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /archive instead/i }),
    ).toBeInTheDocument();
  });
});
