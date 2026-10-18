import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TransactionRow } from "@/components/features/transaction-row";
import type { TransactionDto } from "@/lib/schemas/transactions";

describe("TransactionRow Component", () => {
  const mockIncome: TransactionDto = {
    id: "tx-1",
    type: "income",
    amountMinor: 1500000,
    currency: "PHP",
    occurredOn: "2026-10-18",
    category: { id: "cat-1", name: "Client work", color: "#16a34a" },
    client: { id: "client-1", name: "Acme Corp" },
    project: { id: "proj-1", name: "Redesign" },
    description: "Milestone payment 1",
    notes: null,
    paymentMethod: "Bank Transfer",
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  };

  const mockExpense: TransactionDto = {
    id: "tx-2",
    type: "expense",
    amountMinor: 49900,
    currency: "PHP",
    occurredOn: "2026-10-18",
    category: { id: "cat-2", name: "Software", color: "#ef4444" },
    client: null,
    project: null,
    description: "GitHub Pro",
    notes: null,
    paymentMethod: "Credit Card",
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  };

  it("renders signed formatted amount (+₱15,000.00) for income", () => {
    render(
      <TransactionRow
        transaction={mockIncome}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("+₱15,000.00")).toBeInTheDocument();
    expect(screen.getByText("Milestone payment 1")).toBeInTheDocument();
    expect(screen.getByText("Client work")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp • Redesign")).toBeInTheDocument();
    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
  });

  it("renders signed formatted amount (−₱499.00) for expense", () => {
    render(
      <TransactionRow
        transaction={mockExpense}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("−₱499.00")).toBeInTheDocument();
    expect(screen.getByText("GitHub Pro")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
  });

  it("triggers onEdit and onDelete handlers", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <TransactionRow
        transaction={mockIncome}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const editBtn = screen.getByRole("button", { name: /edit transaction/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockIncome);

    const deleteBtn = screen.getByRole("button", {
      name: /delete transaction/i,
    });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockIncome.id);
  });
});
