import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionRow } from "@/components/features/transaction-row";
import { TransactionForm } from "@/components/features/transaction-form";
import type { TransactionDto } from "@/lib/schemas/transactions";

const mockExpenseTx: TransactionDto = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  type: "expense",
  amountMinor: 85000,
  currency: "PHP",
  occurredOn: "2026-10-18",
  category: { id: "cat-1", name: "Software", color: "#6366f1" },
  client: null,
  project: null,
  description: "Cloud Hosting",
  notes: null,
  paymentMethod: "Credit Card",
  receiptKey: "users/user-1/receipts/rec-123.pdf",
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Transaction Receipt UI Component Tests", () => {
  it("renders receipt indicator in TransactionRow when receiptKey is present", () => {
    render(
      <TransactionRow
        transaction={mockExpenseTx}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId(`receipt-indicator-${mockExpenseTx.id}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Receipt")).toBeInTheDocument();
  });

  it("does not render receipt indicator in TransactionRow when receiptKey is null", () => {
    const noReceiptTx: TransactionDto = {
      ...mockExpenseTx,
      id: "550e8400-e29b-41d4-a716-446655440002",
      receiptKey: null,
    };

    render(
      <TransactionRow
        transaction={noReceiptTx}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(`receipt-indicator-${noReceiptTx.id}`),
    ).not.toBeInTheDocument();
  });

  it("renders receipt attachment input when type is expense, but hides it when toggled to income", () => {
    render(
      <TransactionForm
        initialData={{ type: "expense" }}
        categories={[
          {
            id: "cat-1",
            name: "Software",
            type: "expense",
            color: null,
            archivedAt: null,
            createdAt: "2026-10-18T00:00:00.000Z",
            updatedAt: "2026-10-18T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByLabelText(/receipt attachment/i)).toBeInTheDocument();

    // Toggle to Income
    const incomeButton = screen.getByRole("button", { name: /\+ income/i });
    fireEvent.click(incomeButton);

    expect(
      screen.queryByLabelText(/receipt attachment/i),
    ).not.toBeInTheDocument();
  });

  it("renders View Receipt and Remove buttons when editing an expense with an existing receipt", () => {
    render(
      <TransactionForm
        initialData={mockExpenseTx}
        categories={[
          {
            id: "cat-1",
            name: "Software",
            type: "expense",
            color: null,
            archivedAt: null,
            createdAt: "2026-10-18T00:00:00.000Z",
            updatedAt: "2026-10-18T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /view receipt/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });
});
