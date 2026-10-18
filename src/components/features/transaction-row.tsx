"use client";

import { Pencil, Trash2, Paperclip } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { TransactionDto } from "@/lib/schemas/transactions";

interface TransactionRowProps {
  transaction: TransactionDto;
  onEdit: (tx: TransactionDto) => void;
  onDelete: (id: string) => void;
}

export function TransactionRow({
  transaction,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const isIncome = transaction.type === "income";
  const formattedAmount = formatMoney(
    transaction.amountMinor,
    transaction.currency,
  );
  const displayAmount = isIncome
    ? `+${formattedAmount}`
    : `−${formattedAmount}`;

  return (
    <div
      role="row"
      data-testid={`transaction-row-${transaction.id}`}
      className="border-border bg-surface hover:bg-muted/40 group flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Left side: Date, Category badge, Description, Client/Project */}
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        {/* Category color dot & type indicator */}
        <div
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:mt-0"
          style={{
            backgroundColor: transaction.category.color
              ? `${transaction.category.color}20`
              : "var(--muted)",
          }}
        >
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                transaction.category.color ?? "var(--muted-foreground)",
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground truncate text-sm font-semibold">
              {transaction.description || transaction.category.name}
            </span>

            {/* Category Chip */}
            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium">
              {transaction.category.name}
            </span>

            {/* Client / Project pill if present */}
            {transaction.client && (
              <span className="border-border text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]">
                {transaction.client.name}
                {transaction.project && ` • ${transaction.project.name}`}
              </span>
            )}

            {/* Receipt indicator if present */}
            {transaction.receiptKey && (
              <span
                data-testid={`receipt-indicator-${transaction.id}`}
                title="Receipt attached"
                className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
              >
                <Paperclip className="h-3 w-3" aria-hidden="true" />
                <span>Receipt</span>
              </span>
            )}
          </div>

          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span>{transaction.occurredOn}</span>
            {transaction.paymentMethod && (
              <>
                <span>•</span>
                <span>{transaction.paymentMethod}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Signed Amount and Actions */}
      <div className="border-border flex items-center justify-between gap-4 border-t pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
        <span
          className="text-base font-semibold tracking-tight tabular-nums sm:text-right"
          style={{
            color: isIncome ? "var(--income)" : "var(--expense)",
          }}
        >
          {displayAmount}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-75 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            aria-label={`Edit transaction ${transaction.description || transaction.category.name}`}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            aria-label={`Delete transaction ${transaction.description || transaction.category.name}`}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
