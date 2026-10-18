import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionsManager } from "@/components/features/transactions-manager";
import { ToastContextProvider } from "@/components/ui/toast";
import type { TransactionDto } from "@/lib/schemas/transactions";

const mockTransactions: TransactionDto[] = [
  {
    id: "tx-1",
    type: "income",
    amountMinor: 5000000,
    currency: "PHP",
    occurredOn: "2026-10-18",
    category: { id: "cat-1", name: "Client work", color: "#16a34a" },
    client: { id: "client-1", name: "Acme Corp" },
    project: null,
    description: "Website project payment",
    notes: null,
    paymentMethod: "Bank Transfer",
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "tx-2",
    type: "expense",
    amountMinor: 120000,
    currency: "PHP",
    occurredOn: "2026-10-18",
    category: { id: "cat-2", name: "Software", color: "#ef4444" },
    client: null,
    project: null,
    description: "Hosting bill",
    notes: null,
    paymentMethod: "Credit Card",
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

describe("TransactionsManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/categories")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: "cat-1",
                  name: "Client work",
                  type: "income",
                  color: "#16a34a",
                  archivedAt: null,
                },
                {
                  id: "cat-2",
                  name: "Software",
                  type: "expense",
                  color: "#ef4444",
                  archivedAt: null,
                },
              ],
            }),
        });
      }
      if (url.includes("/api/v1/clients")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "client-1", name: "Acme Corp", archivedAt: null }],
            }),
        });
      }
      if (url.includes("/api/v1/transactions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockTransactions,
              meta: { nextCursor: null, limit: 25 },
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it("loads and renders transactions list", async () => {
    render(
      <ToastContextProvider>
        <TransactionsManager />
      </ToastContextProvider>,
    );

    expect(
      screen.getByRole("status", { name: /loading transactions/i }),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Website project payment"),
    ).toBeInTheDocument();
    expect(screen.getByText("Hosting bill")).toBeInTheDocument();
    expect(screen.getByText("+₱50,000.00")).toBeInTheDocument();
    expect(screen.getByText("−₱1,200.00")).toBeInTheDocument();
  });

  it("handles delete with Undo functionality", async () => {
    // Mock DELETE endpoint
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          return Promise.resolve({ ok: true, status: 204 });
        }
        if (init?.method === "POST" && url.includes("/restore")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockTransactions[0] }),
          });
        }
        if (url.includes("/api/v1/transactions")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: mockTransactions,
                meta: { nextCursor: null, limit: 25 },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

    render(
      <ToastContextProvider>
        <TransactionsManager />
      </ToastContextProvider>,
    );

    expect(
      await screen.findByText("Website project payment"),
    ).toBeInTheDocument();

    // Click delete on the first transaction
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete transaction/i,
    });
    fireEvent.click(deleteButtons[0]!);

    // Item should be removed from view
    await waitFor(() => {
      expect(
        screen.queryByText("Website project payment"),
      ).not.toBeInTheDocument();
    });

    // Undo button should appear in toast
    const undoButton = await screen.findByRole("button", { name: /undo/i });
    expect(undoButton).toBeInTheDocument();

    // Click Undo
    fireEvent.click(undoButton);

    // Item should be restored back to view
    expect(
      await screen.findByText("Website project payment"),
    ).toBeInTheDocument();
  });

  it("renders Export CSV button", async () => {
    render(
      <ToastContextProvider>
        <TransactionsManager />
      </ToastContextProvider>,
    );

    const exportLink = await screen.findByRole("link", { name: /export csv/i });
    expect(exportLink).toBeInTheDocument();
    expect(exportLink).toHaveAttribute(
      "href",
      expect.stringContaining("/api/v1/export/transactions.csv"),
    );
    await screen.findByText("Website project payment");
  });
});
