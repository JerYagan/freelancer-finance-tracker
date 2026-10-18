"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Tag,
  AlertCircle,
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
import { cn } from "@/lib/utils";
import type { CategoryDto } from "@/lib/schemas/categories";

const PRESET_COLORS = [
  "#16a34a", // emerald
  "#0d9488", // teal
  "#0284c7", // light blue
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#64748b", // slate
  "#71717a", // zinc
];

export function CategoriesManager() {
  const { toast } = useToast();

  const [categories, setCategories] = React.useState<CategoryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "all" | "income" | "expense"
  >("all");

  // Create / Edit modal state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] =
    React.useState<CategoryDto | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formType, setFormType] = React.useState<"income" | "expense">(
    "expense",
  );
  const [formColor, setFormColor] = React.useState(PRESET_COLORS[0]!);
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Archive warning modal state (triggered on 409 delete conflict)
  const [archivePrompt, setArchivePrompt] = React.useState<{
    category: CategoryDto;
    message: string;
  } | null>(null);

  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/v1/categories?includeArchived=${includeArchived ? "true" : "false"}`,
        );
        const body = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setError(body.error?.message || "Failed to load categories");
          } else {
            setCategories(body.data ?? []);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "Failed to load categories",
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [includeArchived, refreshKey]);

  const triggerRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const openCreateDialog = (type: "income" | "expense" = "expense") => {
    setEditingCategory(null);
    setFormName("");
    setFormType(type);
    setFormColor(PRESET_COLORS[0]!);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (category: CategoryDto) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormType(category.type);
    setFormColor(category.color || PRESET_COLORS[0]!);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Category name cannot be empty");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const endpoint = editingCategory
        ? `/api/v1/categories/${editingCategory.id}`
        : "/api/v1/categories";
      const method = editingCategory ? "PATCH" : "POST";
      const payload = editingCategory
        ? { name: formName.trim(), color: formColor }
        : { name: formName.trim(), type: formType, color: formColor };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        setFormError(body.error?.message || "Failed to save category");
        setFormSubmitting(false);
        return;
      }

      toast({
        title: editingCategory ? "Category updated" : "Category created",
        description: `"${body.data.name}" has been saved.`,
        variant: "success",
      });

      setDialogOpen(false);
      triggerRefresh();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleArchive = async (category: CategoryDto) => {
    const isArchived = category.archivedAt !== null;
    try {
      const res = await fetch(`/api/v1/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !isArchived }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to update category");
      }

      toast({
        title: isArchived ? "Category restored" : "Category archived",
        description: `"${category.name}" is now ${isArchived ? "active" : "archived"}.`,
        variant: "success",
      });
      triggerRefresh();
    } catch (err) {
      toast({
        title: "Action failed",
        description:
          err instanceof Error ? err.message : "Error updating category",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (category: CategoryDto) => {
    try {
      const res = await fetch(`/api/v1/categories/${category.id}`, {
        method: "DELETE",
      });

      if (res.status === 409) {
        const body = await res.json();
        // Item in use: prompt user to archive instead
        setArchivePrompt({
          category,
          message:
            body.error?.message ||
            "This category is in use by transactions and cannot be deleted. Archive it instead to hide it from future transactions.",
        });
        return;
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete category");
      }

      toast({
        title: "Category deleted",
        description: `"${category.name}" was permanently removed.`,
        variant: "success",
      });
      triggerRefresh();
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Could not delete category",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (activeTab === "income") return c.type === "income";
    if (activeTab === "expense") return c.type === "expense";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Categories
          </h1>
          <p className="text-muted-foreground text-sm">
            Customize income streams and expense buckets with distinct colors.
          </p>
        </div>

        <Button onClick={() => openCreateDialog()} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>New Category</span>
        </Button>
      </div>

      {/* Tabs & Archive Filter Toggle */}
      <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-xs">
        {/* Type Filter Buttons */}
        <div
          aria-label="Category type filters"
          className="flex items-center gap-1"
        >
          <button
            type="button"
            aria-pressed={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            className={cn(
              "focus-visible:ring-ring h-8 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeTab === "all"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "income"}
            onClick={() => setActiveTab("income")}
            className={cn(
              "focus-visible:ring-ring h-8 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeTab === "income"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Income
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "expense"}
            onClick={() => setActiveTab("expense")}
            className={cn(
              "focus-visible:ring-ring h-8 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeTab === "expense"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Expense
          </button>
        </div>

        {/* Include Archived toggle */}
        <label className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="border-input text-primary focus:ring-ring h-4 w-4 rounded"
          />
          <span>Show archived categories</span>
        </label>
      </div>

      {/* Categories List */}
      {loading ? (
        <div
          role="status"
          aria-label="Loading categories"
          className="space-y-3"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-surface h-16 animate-pulse rounded-xl border p-4"
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
          <Button variant="outline" size="sm" onClick={triggerRefresh}>
            Retry
          </Button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories found"
          description={
            includeArchived
              ? "No categories match the current filter."
              : "Create a custom category or enable showing archived categories."
          }
          action={
            <Button
              size="sm"
              onClick={() => openCreateDialog()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((c) => {
            const isArchived = c.archivedAt !== null;
            return (
              <div
                key={c.id}
                data-testid={`category-card-${c.id}`}
                className={cn(
                  "border-border bg-surface group flex items-center justify-between rounded-xl border p-4 shadow-xs transition-colors",
                  isArchived && "bg-muted/30 opacity-60",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: c.color
                        ? `${c.color}20`
                        : "var(--muted)",
                    }}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: c.color ?? "var(--muted-foreground)",
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {c.name}
                      </p>
                      {isArchived && (
                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs capitalize">
                      {c.type}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditDialog(c)}
                    aria-label={`Edit ${c.name}`}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(c)}
                    aria-label={
                      isArchived ? `Restore ${c.name}` : `Archive ${c.name}`
                    }
                    title={isArchived ? "Restore category" : "Archive category"}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
                  >
                    {isArchived ? (
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    aria-label={`Delete ${c.name}`}
                    title="Delete category"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent sheetOnMobile>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category name or color code."
                : "Create a custom category for classifying income or expenses."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs font-medium"
              >
                {formError}
              </div>
            )}

            {/* Type Toggle (only for new categories) */}
            {!editingCategory && (
              <div className="space-y-1.5">
                <label className="text-foreground block text-xs font-medium tracking-tight">
                  Type
                </label>
                <div
                  role="group"
                  className="bg-muted border-border grid grid-cols-2 gap-1 rounded-lg border p-1"
                >
                  <button
                    type="button"
                    onClick={() => setFormType("expense")}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-xs font-medium transition-all",
                      formType === "expense"
                        ? "bg-surface text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground",
                    )}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("income")}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-xs font-medium transition-all",
                      formType === "income"
                        ? "bg-surface text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground",
                    )}
                  >
                    Income
                  </button>
                </div>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="cat-name-input"
                className="text-foreground block text-xs font-medium tracking-tight"
              >
                Name
              </label>
              <Input
                id="cat-name-input"
                type="text"
                placeholder="e.g. Subscriptions, Travel, Retainers"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {/* Color Palette */}
            <div className="space-y-1.5">
              <span
                id="cat-color-label"
                className="text-foreground block text-xs font-medium tracking-tight"
              >
                Color Accent
              </span>
              <div
                role="radiogroup"
                aria-labelledby="cat-color-label"
                className="flex flex-wrap items-center gap-2 pt-1"
              >
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={formColor === color}
                    onClick={() => setFormColor(color)}
                    aria-label={`Color option ${color}`}
                    className={cn(
                      "focus-visible:ring-ring min-h-[32px] min-w-[32px] rounded-full transition-transform focus-visible:ring-2 focus-visible:outline-none sm:h-7 sm:w-7",
                      formColor === color
                        ? "ring-foreground scale-115 ring-2"
                        : "hover:scale-105",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting
                  ? "Saving..."
                  : editingCategory
                    ? "Save Changes"
                    : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 409 In-Use Conflict Fallback Modal */}
      <Dialog
        open={Boolean(archivePrompt)}
        onOpenChange={(open) => {
          if (!open) setArchivePrompt(null);
        }}
      >
        <DialogContent sheetOnMobile>
          <DialogHeader>
            <DialogTitle>Category In Use</DialogTitle>
            <DialogDescription>{archivePrompt?.message}</DialogDescription>
          </DialogHeader>

          <div className="border-border bg-muted/40 space-y-2 rounded-xl border p-4 text-xs">
            <p className="text-foreground font-medium">
              Why archive instead of deleting?
            </p>
            <p className="text-muted-foreground">
              Archiving hides &quot;{archivePrompt?.category.name}&quot; from
              new transaction drop-downs while protecting your past financial
              records and monthly reports intact.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchivePrompt(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (archivePrompt) {
                  const cat = archivePrompt.category;
                  setArchivePrompt(null);
                  handleToggleArchive(cat);
                }
              }}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              <span>Archive Category Instead</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
