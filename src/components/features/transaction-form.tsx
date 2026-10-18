"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryDto } from "@/lib/schemas/categories";
import type { ClientDto } from "@/lib/schemas/clients";
import type { ProjectDto } from "@/lib/schemas/projects";
import type {
  TransactionCreateInput,
  TransactionDto,
} from "@/lib/schemas/transactions";
import { enqueueOfflineTransaction } from "@/lib/offline-queue";

export interface TransactionFormProps {
  initialData?: Partial<TransactionDto>;
  categories?: CategoryDto[];
  clients?: ClientDto[];
  projects?: ProjectDto[];
  defaultCurrency?: string;
  onSuccess?: (transaction: TransactionDto) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TransactionForm({
  initialData,
  categories: initialCategories,
  clients: initialClients,
  projects: initialProjects,
  defaultCurrency = "PHP",
  onSuccess,
  onCancel,
  submitLabel = "Save Transaction",
}: TransactionFormProps) {
  const [type, setType] = React.useState<"income" | "expense">(
    initialData?.type ?? "expense",
  );
  const [amountMinor, setAmountMinor] = React.useState<number | null>(
    initialData?.amountMinor ?? null,
  );
  const [occurredOn, setOccurredOn] = React.useState<string>(
    initialData?.occurredOn ?? getTodayString(),
  );
  const [categoryId, setCategoryId] = React.useState<string>(
    initialData?.category?.id ?? "",
  );
  const [clientId, setClientId] = React.useState<string>(
    initialData?.client?.id ?? "",
  );
  const [projectId, setProjectId] = React.useState<string>(
    initialData?.project?.id ?? "",
  );
  const [description, setDescription] = React.useState<string>(
    initialData?.description ?? "",
  );
  const [paymentMethod, setPaymentMethod] = React.useState<string>(
    initialData?.paymentMethod ?? "",
  );
  const [notes, setNotes] = React.useState<string>(initialData?.notes ?? "");

  // Categories, clients, projects lists
  const [categoriesList, setCategoriesList] = React.useState<CategoryDto[]>(
    initialCategories ?? [],
  );
  const [clientsList, setClientsList] = React.useState<ClientDto[]>(
    initialClients ?? [],
  );
  const [projectsList, setProjectsList] = React.useState<ProjectDto[]>(
    initialProjects ?? [],
  );

  const [loadingLists, setLoadingLists] = React.useState(
    !initialCategories || !initialClients || !initialProjects,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [existingReceiptKey, setExistingReceiptKey] = React.useState<
    string | null
  >(initialData?.receiptKey ?? null);
  const [loadingReceipt, setLoadingReceipt] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  const handleViewReceipt = async () => {
    if (!initialData?.id) return;
    setLoadingReceipt(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/v1/transactions/${initialData.id}/receipt`);
      const body = await res.json();
      if (!res.ok) {
        setReceiptError(body.error?.message || "Failed to load receipt");
        return;
      }
      window.open(body.data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      setReceiptError("Network error loading receipt");
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleRemoveReceipt = async () => {
    if (!initialData?.id) return;
    setLoadingReceipt(true);
    setReceiptError(null);
    try {
      const res = await fetch(
        `/api/v1/transactions/${initialData.id}/receipt`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const body = await res.json();
        setReceiptError(body.error?.message || "Failed to remove receipt");
        return;
      }
      setExistingReceiptKey(null);
    } catch {
      setReceiptError("Network error removing receipt");
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setReceiptError("Invalid file type. Only JPG, PNG, and PDF are allowed.");
      e.target.value = "";
      setReceiptFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setReceiptError("File exceeds 10 MB limit.");
      e.target.value = "";
      setReceiptFile(null);
      return;
    }

    setReceiptFile(file);
  };

  // Fetch reference lists if not provided
  React.useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [catsRes, clientsRes, projectsRes] = await Promise.all([
          initialCategories
            ? Promise.resolve(null)
            : fetch("/api/v1/categories").then((r) => r.json()),
          initialClients
            ? Promise.resolve(null)
            : fetch("/api/v1/clients").then((r) => r.json()),
          initialProjects
            ? Promise.resolve(null)
            : fetch("/api/v1/projects").then((r) => r.json()),
        ]);

        if (isMounted) {
          if (catsRes?.data) setCategoriesList(catsRes.data);
          if (clientsRes?.data) setClientsList(clientsRes.data);
          if (projectsRes?.data) setProjectsList(projectsRes.data);
        }
      } catch {
        // Ignore reference fetch errors (user can still enter transaction)
      } finally {
        if (isMounted) {
          setLoadingLists(false);
        }
      }
    }

    if (!initialCategories || !initialClients || !initialProjects) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [initialCategories, initialClients, initialProjects]);

  // Filter categories by selected transaction type
  const availableCategories = React.useMemo(() => {
    return categoriesList.filter(
      (c) => c.type === type && c.archivedAt === null,
    );
  }, [categoriesList, type]);

  // Derived effective category ID (falls back to first available category if current selection is invalid)
  const effectiveCategoryId = React.useMemo(() => {
    if (categoryId && availableCategories.some((c) => c.id === categoryId)) {
      return categoryId;
    }
    return availableCategories[0]?.id ?? "";
  }, [categoryId, availableCategories]);

  // Filter projects by selected client (or show all unassigned projects)
  const availableProjects = React.useMemo(() => {
    return projectsList.filter((p) => {
      if (p.archivedAt !== null) return false;
      if (!clientId) return true;
      return p.clientId === clientId || p.clientId === null;
    });
  }, [projectsList, clientId]);

  const handleTypeChange = (newType: "income" | "expense") => {
    setType(newType);
    setFieldErrors((prev) => ({ ...prev, categoryId: "" }));
  };

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    if (newProjectId) {
      const selectedProj = projectsList.find((p) => p.id === newProjectId);
      if (selectedProj?.clientId) {
        setClientId(selectedProj.clientId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-side quick checks
    const resolvedCategory = categoryId || effectiveCategoryId;
    const errors: Record<string, string> = {};
    if (!amountMinor || amountMinor <= 0) {
      errors.amountMinor = "Please enter an amount greater than 0";
    }
    if (!resolvedCategory) {
      errors.categoryId = "Please select a category";
    }
    if (!occurredOn) {
      errors.occurredOn = "Please select a date";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    const payload: TransactionCreateInput = {
      type,
      amountMinor: amountMinor!,
      currency: initialData?.currency ?? defaultCurrency,
      occurredOn,
      categoryId: resolvedCategory,
      clientId: clientId || null,
      projectId: projectId || null,
      description: description.trim() || null,
      paymentMethod: paymentMethod.trim() || null,
      notes: notes.trim() || null,
    };

    const createOptimisticTx = (queuedId: string): TransactionDto => {
      const resolvedCategoryObj = categoriesList.find(
        (c) => c.id === resolvedCategory,
      ) || {
        id: resolvedCategory,
        name: "Categorized",
        color: null,
      };
      const resolvedClientObj =
        clientsList.find((c) => c.id === clientId) || null;
      const resolvedProjectObj =
        projectsList.find((p) => p.id === projectId) || null;

      return {
        id: queuedId,
        type: payload.type,
        amountMinor: payload.amountMinor,
        currency: payload.currency ?? defaultCurrency,
        occurredOn: payload.occurredOn,
        category: {
          id: resolvedCategoryObj.id,
          name: resolvedCategoryObj.name,
          color: resolvedCategoryObj.color,
        },
        client: resolvedClientObj
          ? { id: resolvedClientObj.id, name: resolvedClientObj.name }
          : null,
        project: resolvedProjectObj
          ? { id: resolvedProjectObj.id, name: resolvedProjectObj.name }
          : null,
        description: payload.description ?? null,
        notes: payload.notes ?? null,
        paymentMethod: payload.paymentMethod ?? null,
        receiptKey: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    };

    // Proactive offline handling for new transactions
    if (
      !initialData?.id &&
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      const queuedId = enqueueOfflineTransaction(payload);
      const optimisticTx = createOptimisticTx(queuedId);
      setSubmitting(false);
      onSuccess?.(optimisticTx);
      return;
    }

    try {
      const endpoint = initialData?.id
        ? `/api/v1/transactions/${initialData.id}`
        : "/api/v1/transactions";
      const method = initialData?.id ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.error?.fields) {
          setFieldErrors(body.error.fields);
        }
        setFormError(body.error?.message || "Failed to save transaction");
        setSubmitting(false);
        return;
      }

      let savedData: TransactionDto = body.data;

      // If a receipt file was selected on an expense, upload it via presigned URL
      if (type === "expense" && receiptFile) {
        try {
          const presignRes = await fetch(
            `/api/v1/transactions/${savedData.id}/receipt`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: receiptFile.name,
                contentType: receiptFile.type,
                fileSizeBytes: receiptFile.size,
              }),
            },
          );

          if (presignRes.ok) {
            const presignBody = await presignRes.json();
            const { uploadUrl, headers } = presignBody.data;

            await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                ...(headers || {}),
                "Content-Type": receiptFile.type,
              },
              body: receiptFile,
            });

            savedData = {
              ...savedData,
              receiptKey: presignBody.data.receiptKey,
            };
          }
        } catch (uploadErr) {
          console.error("Failed to upload receipt:", uploadErr);
        }
      }

      onSuccess?.(savedData);
    } catch {
      // Reactive offline fallback
      if (
        !initialData?.id &&
        (typeof navigator === "undefined" || !navigator.onLine)
      ) {
        const queuedId = enqueueOfflineTransaction(payload);
        const optimisticTx = createOptimisticTx(queuedId);
        setSubmitting(false);
        onSuccess?.(optimisticTx);
        return;
      }

      setFormError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs font-medium"
        >
          {formError}
        </div>
      )}

      {/* Segmented Control: Income vs Expense */}
      <div className="space-y-1.5">
        <span
          id="transaction-type-label"
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          Transaction Type
        </span>
        <div
          role="group"
          aria-labelledby="transaction-type-label"
          className="bg-muted border-border grid grid-cols-2 gap-1 rounded-lg border p-1"
        >
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            aria-pressed={type === "income"}
            className={cn(
              "focus-visible:ring-ring flex h-9 items-center justify-center rounded-md text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none",
              type === "income"
                ? "bg-surface text-income font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            + Income
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            aria-pressed={type === "expense"}
            className={cn(
              "focus-visible:ring-ring flex h-9 items-center justify-center rounded-md text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none",
              type === "expense"
                ? "bg-surface text-expense font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            − Expense
          </button>
        </div>
      </div>

      {/* Amount (MoneyInput) */}
      <MoneyInput
        label="Amount"
        currency={initialData?.currency ?? defaultCurrency}
        value={amountMinor}
        onChangeValue={(minor) => {
          setAmountMinor(minor);
          if (minor && minor > 0) {
            setFieldErrors((prev) => ({ ...prev, amountMinor: "" }));
          }
        }}
        error={fieldErrors.amountMinor}
        disabled={submitting}
      />

      {/* Date */}
      <div className="space-y-1.5">
        <label
          htmlFor="transaction-date"
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          Date
        </label>
        <Input
          id="transaction-date"
          type="date"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          disabled={submitting}
          className="h-10 text-sm"
          required
        />
        {fieldErrors.occurredOn && (
          <p className="text-destructive text-xs font-medium">
            {fieldErrors.occurredOn}
          </p>
        )}
      </div>

      {/* Category Dropdown */}
      <div className="space-y-1.5">
        <label
          htmlFor="transaction-category"
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          Category
        </label>
        <div className="relative">
          <select
            id="transaction-category"
            value={effectiveCategoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, categoryId: "" }));
            }}
            disabled={submitting || loadingLists}
            className={cn(
              "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
              fieldErrors.categoryId &&
                "border-destructive focus-visible:border-destructive",
            )}
          >
            {availableCategories.length === 0 ? (
              <option value="" disabled>
                {loadingLists ? "Loading categories..." : "No categories found"}
              </option>
            ) : (
              availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>
        {fieldErrors.categoryId && (
          <p className="text-destructive text-xs font-medium">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="transaction-description"
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          Description
        </label>
        <Input
          id="transaction-description"
          type="text"
          placeholder="e.g. Website redesign milestone 1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          className="h-10"
        />
        {fieldErrors.description && (
          <p className="text-destructive text-xs font-medium">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Optional Client and Project Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="transaction-client"
            className="text-foreground block text-xs font-medium tracking-tight"
          >
            Client{" "}
            <span className="text-muted-foreground font-normal">
              (Optional)
            </span>
          </label>
          <select
            id="transaction-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={submitting || loadingLists}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">None</option>
            {clientsList
              .filter((c) => c.archivedAt === null)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="transaction-project"
            className="text-foreground block text-xs font-medium tracking-tight"
          >
            Project{" "}
            <span className="text-muted-foreground font-normal">
              (Optional)
            </span>
          </label>
          <select
            id="transaction-project"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={submitting || loadingLists}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">None</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <label
          htmlFor="transaction-payment-method"
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          Payment Method{" "}
          <span className="text-muted-foreground font-normal">(Optional)</span>
        </label>
        <Input
          id="transaction-payment-method"
          type="text"
          placeholder="e.g. Bank Transfer, Card, Cash, GCash"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={submitting}
          className="h-10"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label
          htmlFor="transaction-notes"
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          Notes{" "}
          <span className="text-muted-foreground font-normal">(Optional)</span>
        </label>
        <textarea
          id="transaction-notes"
          rows={3}
          placeholder="Additional details, tax deduction notes, or invoice references..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-surface w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Receipt Attachment (Expenses only) */}
      {type === "expense" && (
        <div className="border-border bg-muted/20 space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="transaction-receipt-file"
              className="text-foreground block text-xs font-medium tracking-tight"
            >
              Receipt Attachment{" "}
              <span className="text-muted-foreground font-normal">
                (JPG, PNG, PDF up to 10MB)
              </span>
            </label>

            {existingReceiptKey && initialData?.id && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleViewReceipt}
                  disabled={loadingReceipt}
                  className="h-7 px-2 text-xs"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  View Receipt
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveReceipt}
                  disabled={loadingReceipt}
                  className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>

          <Input
            id="transaction-receipt-file"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            disabled={submitting}
            onChange={handleFileChange}
            className="file:bg-primary file:text-primary-foreground h-9 text-xs file:mr-2 file:rounded file:border-0 file:px-2 file:py-1 file:text-xs"
          />

          {receiptError && (
            <p className="text-destructive text-xs font-medium">
              {receiptError}
            </p>
          )}

          {receiptFile && (
            <p className="text-muted-foreground text-xs">
              Selected:{" "}
              <span className="text-foreground font-medium">
                {receiptFile.name}
              </span>{" "}
              ({(receiptFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting || loadingLists}
          className="min-w-[120px]"
        >
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
