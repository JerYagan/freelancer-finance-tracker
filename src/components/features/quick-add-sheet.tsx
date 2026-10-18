"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/features/transaction-form";
import type { TransactionDto } from "@/lib/schemas/transactions";

export interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (transaction: TransactionDto) => void;
  defaultCurrency?: string;
}

export function QuickAddSheet({
  open,
  onOpenChange,
  onSuccess,
  defaultCurrency = "PHP",
}: QuickAddSheetProps) {
  const handleSuccess = (transaction: TransactionDto) => {
    onSuccess?.(transaction);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sheetOnMobile aria-describedby="quick-add-description">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription id="quick-add-description">
            Quickly log an income or expense to keep your freelance finances
            updated.
          </DialogDescription>
        </DialogHeader>

        <TransactionForm
          defaultCurrency={defaultCurrency}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          submitLabel="Add Transaction"
        />
      </DialogContent>
    </Dialog>
  );
}
