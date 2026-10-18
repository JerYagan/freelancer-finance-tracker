"use client";

import * as React from "react";
import {
  Plus,
  Search,
  RotateCcw,
  AlertCircle,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { TransactionRow } from "@/components/features/transaction-row";
import { TransactionForm } from "@/components/features/transaction-form";
import type { CategoryDto } from "@/lib/schemas/categories";
import type { ClientDto } from "@/lib/schemas/clients";
import type { TransactionDto } from "@/lib/schemas/transactions";

export function TransactionsManager() {
  const { toast } = useToast();

  // Data states
  const [transactions, setTransactions] = React.useState<TransactionDto[]>([]);
  const [categories, setCategories] = React.useState<CategoryDto[]>([]);
  const [clients, setClients] = React.useState<ClientDto[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  // Status states
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("");
  const [selectedClient, setSelectedClient] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  // Edit and Add Dialogs
  const [editingTransaction, setEditingTransaction] =
    React.useState<TransactionDto | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Fetch reference lists (categories and clients)
  React.useEffect(() => {
    async function loadRefs() {
      try {
        const [catsRes, clientsRes] = await Promise.all([
          fetch("/api/v1/categories").then((r) => r.json()),
          fetch("/api/v1/clients").then((r) => r.json()),
        ]);
        if (catsRes?.data) setCategories(catsRes.data);
        if (clientsRes?.data) setClients(clientsRes.data);
      } catch {
        // Handled silently
      }
    }
    loadRefs();
  }, []);

  const [retryCount, setRetryCount] = React.useState(0);

  // Auto-refresh when a new transaction is logged via quick-add sheet
  React.useEffect(() => {
    const handleCreated = () => {
      setRetryCount((c) => c + 1);
    };
    window.addEventListener("transaction-created", handleCreated);
    return () =>
      window.removeEventListener("transaction-created", handleCreated);
  }, []);

  // Fetch transactions whenever filters change or retry is triggered
  React.useEffect(() => {
    let ignore = false;

    async function load() {
      const params = new URLSearchParams();
      params.set("limit", "25");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedType) params.set("type", selectedType);
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (selectedClient) params.set("clientId", selectedClient);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      try {
        const res = await fetch(`/api/v1/transactions?${params.toString()}`);
        const body = await res.json();

        if (!ignore) {
          if (!res.ok) {
            setError(body.error?.message || "Failed to load transactions");
          } else {
            setTransactions(body.data ?? []);
            setNextCursor(body.meta?.nextCursor ?? null);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred",
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [
    searchQuery,
    selectedType,
    selectedCategory,
    selectedClient,
    fromDate,
    toDate,
    retryCount,
  ]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    const params = new URLSearchParams();
    params.set("limit", "25");
    params.set("cursor", nextCursor);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (selectedType) params.set("type", selectedType);
    if (selectedCategory) params.set("categoryId", selectedCategory);
    if (selectedClient) params.set("clientId", selectedClient);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    try {
      const res = await fetch(`/api/v1/transactions?${params.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setTransactions((prev) => [...prev, ...(body.data ?? [])]);
        setNextCursor(body.meta?.nextCursor ?? null);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setRetryCount((c) => c + 1);
  };

  // Handle Delete with Undo Toast
  const handleDelete = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    // Optimistically remove from state
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api/v1/transactions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Rollback on failure
        setTransactions((prev) => [txToDelete, ...prev]);
        toast({
          title: "Failed to delete",
          description: "Could not delete transaction. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Show Undo Toast
      toast({
        title: "Transaction deleted",
        description: `${txToDelete.description || txToDelete.category.name} was deleted.`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const restoreRes = await fetch(
                `/api/v1/transactions/${id}/restore`,
                { method: "POST" },
              );
              const restoreBody = await restoreRes.json();
              if (restoreRes.ok && restoreBody.data) {
                // Restore item to list
                setTransactions((prev) => [restoreBody.data, ...prev]);
                toast({
                  title: "Restored",
                  description: "Transaction restored successfully.",
                  variant: "success",
                });
              }
            } catch {
              toast({
                title: "Restore failed",
                description: "Failed to restore transaction.",
                variant: "destructive",
              });
            }
          },
        },
      });
    } catch {
      setTransactions((prev) => [txToDelete, ...prev]);
      toast({
        title: "Failed to delete",
        description: "Network error occurred.",
        variant: "destructive",
      });
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedType ||
    selectedCategory ||
    selectedClient ||
    fromDate ||
    toDate,
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("");
    setSelectedCategory("");
    setSelectedClient("");
    setFromDate("");
    setToDate("");
  };

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return `/api/v1/export/transactions.csv${queryString}`;
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Page Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Transactions
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor income, expenses, and manage financial records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="gap-2 shadow-xs">
            <a href={exportUrl} download="transactions.csv">
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </a>
          </Button>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border-border bg-surface space-y-4 rounded-xl border p-4 shadow-xs">
        {/* Search input */}
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="search-transactions"
            type="search"
            aria-label="Search transactions by description or notes"
            placeholder="Search by description or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {/* Type Filter */}
          <div>
            <label
              htmlFor="filter-type"
              className="text-muted-foreground mb-1 block text-[11px] font-medium"
            >
              Type
            </label>
            <select
              id="filter-type"
              aria-label="Filter by type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border-input bg-surface focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-xs font-medium outline-none focus-visible:ring-2"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label
              htmlFor="filter-category"
              className="text-muted-foreground mb-1 block text-[11px] font-medium"
            >
              Category
            </label>
            <select
              id="filter-category"
              aria-label="Filter by category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border-input bg-surface focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-xs font-medium outline-none focus-visible:ring-2"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label
              htmlFor="filter-client"
              className="text-muted-foreground mb-1 block text-[11px] font-medium"
            >
              Client
            </label>
            <select
              id="filter-client"
              aria-label="Filter by client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="border-input bg-surface focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-xs font-medium outline-none focus-visible:ring-2"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label
              htmlFor="filter-from-date"
              className="text-muted-foreground mb-1 block text-[11px] font-medium"
            >
              From Date
            </label>
            <Input
              id="filter-from-date"
              type="date"
              aria-label="Filter from date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* To Date */}
          <div>
            <label
              htmlFor="filter-to-date"
              className="text-muted-foreground mb-1 block text-[11px] font-medium"
            >
              To Date
            </label>
            <Input
              id="filter-to-date"
              type="date"
              aria-label="Filter to date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Clear Filters indicator */}
        {hasActiveFilters && (
          <div className="border-border flex items-center justify-between border-t pt-3 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Active filters applied
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Transactions List Section */}
      {loading ? (
        <div
          role="status"
          aria-label="Loading transactions"
          className="space-y-3"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-surface h-20 animate-pulse rounded-xl border p-4"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
        >
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No transactions found"
          description={
            hasActiveFilters
              ? "Try clearing or adjusting your filters to see transactions."
              : "Log your first freelance income or expense to get started."
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Transaction</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onEdit={(t) => setEditingTransaction(t)}
              onDelete={handleDelete}
            />
          ))}

          {/* Load More Button for Cursor Pagination */}
          {nextCursor && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="min-w-[160px]"
              >
                {loadingMore ? "Loading..." : "Load More Transactions"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog
        open={Boolean(editingTransaction)}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
      >
        <DialogContent sheetOnMobile>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details, category, or associated client.
            </DialogDescription>
          </DialogHeader>

          {editingTransaction && (
            <TransactionForm
              initialData={editingTransaction}
              categories={categories}
              clients={clients}
              submitLabel="Save Changes"
              onCancel={() => setEditingTransaction(null)}
              onSuccess={(updated) => {
                setTransactions((prev) =>
                  prev.map((t) => (t.id === updated.id ? updated : t)),
                );
                setEditingTransaction(null);
                toast({
                  title: "Transaction updated",
                  description: "Your changes have been saved.",
                  variant: "success",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent sheetOnMobile>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record an income or expense with client and category details.
            </DialogDescription>
          </DialogHeader>

          <TransactionForm
            categories={categories}
            clients={clients}
            submitLabel="Add Transaction"
            onCancel={() => setIsAddOpen(false)}
            onSuccess={(created) => {
              setTransactions((prev) => [created, ...prev]);
              setIsAddOpen(false);
              toast({
                title: "Transaction added",
                description: `${created.description || created.category.name} was added.`,
                variant: "success",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
