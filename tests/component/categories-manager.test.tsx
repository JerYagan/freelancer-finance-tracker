import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoriesManager } from "@/components/features/categories-manager";
import { ToastContextProvider } from "@/components/ui/toast";
import type { CategoryDto } from "@/lib/schemas/categories";

const mockCategories: CategoryDto[] = [
  {
    id: "cat-1",
    name: "Client work",
    type: "income",
    color: "#16a34a",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "cat-2",
    name: "Software",
    type: "expense",
    color: "#6366f1",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "cat-3",
    name: "Old Equipment",
    type: "expense",
    color: "#8b5cf6",
    archivedAt: "2026-10-18T10:00:00Z",
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

describe("CategoriesManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/categories")) {
        const includeArchived = url.includes("includeArchived=true");
        const data = includeArchived
          ? mockCategories
          : mockCategories.filter((c) => c.archivedAt === null);

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it("renders active categories by default and supports type tab filtering", async () => {
    render(
      <ToastContextProvider>
        <CategoriesManager />
      </ToastContextProvider>,
    );

    expect(await screen.findByText("Client work")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.queryByText("Old Equipment")).not.toBeInTheDocument();

    // Click "Income" tab
    fireEvent.click(screen.getByRole("button", { name: /^income$/i }));
    expect(screen.getByText("Client work")).toBeInTheDocument();
    expect(screen.queryByText("Software")).not.toBeInTheDocument();

    // Click "Expense" tab
    fireEvent.click(screen.getByRole("button", { name: /^expense$/i }));
    expect(screen.queryByText("Client work")).not.toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
  });

  it("shows 409 In-Use conflict prompt when category has transactions", async () => {
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
                  message:
                    "Cannot delete category in use by transactions. Archive instead.",
                },
              }),
          });
        }
        if (url.includes("/api/v1/categories")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockCategories }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

    render(
      <ToastContextProvider>
        <CategoriesManager />
      </ToastContextProvider>,
    );

    expect(await screen.findByText("Client work")).toBeInTheDocument();

    // Click delete on Client work
    const deleteBtn = screen.getByRole("button", {
      name: /delete client work/i,
    });
    fireEvent.click(deleteBtn);

    // Modal with Archive fallback should appear
    expect(await screen.findByText("Category In Use")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /archive category instead/i }),
    ).toBeInTheDocument();
  });
});
