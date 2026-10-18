import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionForm } from "@/components/features/transaction-form";
import type { CategoryDto } from "@/lib/schemas/categories";
import type { ClientDto } from "@/lib/schemas/clients";
import type { ProjectDto } from "@/lib/schemas/projects";

const mockCategories: CategoryDto[] = [
  {
    id: "cat-income-1",
    name: "Client work",
    type: "income",
    color: "#16a34a",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "cat-expense-1",
    name: "Software & SaaS",
    type: "expense",
    color: "#6366f1",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

const mockClients: ClientDto[] = [
  {
    id: "client-1",
    name: "Acme Corp",
    email: "billing@acme.com",
    notes: null,
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

const mockProjects: ProjectDto[] = [
  {
    id: "proj-1",
    name: "Landing Page",
    clientId: "client-1",
    archivedAt: null,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
];

describe("TransactionForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters categories to expense categories by default", () => {
    render(
      <TransactionForm
        categories={mockCategories}
        clients={mockClients}
        projects={mockProjects}
      />,
    );

    // Expense is default type
    const categorySelect = screen.getByLabelText(
      /category/i,
    ) as HTMLSelectElement;
    expect(categorySelect).toHaveTextContent("Software & SaaS");
    expect(categorySelect).not.toHaveTextContent("Client work");
  });

  it("updates categories when toggling transaction type to Income", () => {
    render(
      <TransactionForm
        categories={mockCategories}
        clients={mockClients}
        projects={mockProjects}
      />,
    );

    const incomeButton = screen.getByRole("button", { name: /\+ income/i });
    fireEvent.click(incomeButton);

    const categorySelect = screen.getByLabelText(
      /category/i,
    ) as HTMLSelectElement;
    expect(categorySelect).toHaveTextContent("Client work");
    expect(categorySelect).not.toHaveTextContent("Software & SaaS");
  });

  it("shows validation error when submitting with 0 or missing amount", async () => {
    render(
      <TransactionForm
        categories={mockCategories}
        clients={mockClients}
        projects={mockProjects}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /save transaction/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/please enter an amount greater than 0/i),
    ).toBeInTheDocument();
  });

  it("submits valid transaction and invokes onSuccess callback", async () => {
    const onSuccess = vi.fn();
    const mockCreatedTx = {
      id: "tx-new-1",
      type: "income",
      amountMinor: 2500000,
      currency: "PHP",
      occurredOn: "2026-10-18",
      category: { id: "cat-income-1", name: "Client work", color: "#16a34a" },
      client: { id: "client-1", name: "Acme Corp" },
      project: null,
      description: "Milestone 1",
      notes: null,
      paymentMethod: "Bank Transfer",
      createdAt: "2026-10-18T10:00:00Z",
      updatedAt: "2026-10-18T10:00:00Z",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: mockCreatedTx }),
    } as unknown as Response);

    render(
      <TransactionForm
        categories={mockCategories}
        clients={mockClients}
        projects={mockProjects}
        onSuccess={onSuccess}
      />,
    );

    // Switch to income
    fireEvent.click(screen.getByRole("button", { name: /\+ income/i }));

    // Enter amount 25,000 (2500000 minor units)
    const amountInput = screen.getByRole("textbox", { name: /amount/i });
    fireEvent.change(amountInput, { target: { value: "25000" } });
    fireEvent.blur(amountInput);

    // Enter description
    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(descInput, { target: { value: "Milestone 1" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /save transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/transactions",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"amountMinor":2500000'),
        }),
      );
      expect(onSuccess).toHaveBeenCalledWith(mockCreatedTx);
    });
  });

  it("enqueues transaction into offline queue when offline and invokes onSuccess optimistically", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    render(
      <TransactionForm
        categories={mockCategories}
        clients={mockClients}
        projects={mockProjects}
        onSuccess={onSuccess}
      />,
    );

    const amountInput = screen.getByRole("textbox", { name: /amount/i });
    fireEvent.change(amountInput, { target: { value: "150" } });
    fireEvent.blur(amountInput);

    const submitBtn = screen.getByRole("button", { name: /save transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          amountMinor: 15000,
        }),
      );
    });
  });
});
