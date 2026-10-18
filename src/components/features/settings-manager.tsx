"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  Coins,
  Percent,
  Save,
  AlertCircle,
  User,
  Sun,
  Moon,
  Laptop,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Smartphone,
  CloudUpload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePwa } from "@/components/pwa-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOut } from "@/lib/auth-client";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type { SettingsDto } from "@/lib/schemas/settings";

const MONTHS = [
  { value: 1, label: "January (Calendar Year)" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April (e.g. UK)" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July (e.g. Australia)" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October (e.g. US Federal)" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

interface SettingsManagerProps {
  initialSettings?: SettingsDto;
  userEmail?: string;
}

export function SettingsManager({
  initialSettings,
  userEmail,
}: SettingsManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { canInstall, installApp, pendingCount, syncNow } = usePwa();
  const [syncingOffline, setSyncingOffline] = React.useState(false);

  const [displayName, setDisplayName] = React.useState(
    initialSettings?.displayName ?? "",
  );
  const [defaultCurrency, setDefaultCurrency] = React.useState(
    initialSettings?.defaultCurrency ?? "PHP",
  );
  // Convert bps (e.g. 1500) to percent string (e.g. "15")
  const [taxPercent, setTaxPercent] = React.useState(
    initialSettings ? String(initialSettings.taxSetAsideBps / 100) : "0",
  );
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = React.useState(
    initialSettings?.fiscalYearStartMonth ?? 1,
  );

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successSaved, setSuccessSaved] = React.useState(false);

  // Export & Deletion State
  const [exporting, setExporting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/v1/account/export");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to export data");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `freelancer-finance-account-export-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export complete",
        description: "Your account data archive has been downloaded.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description:
          err instanceof Error ? err.message : "Failed to export account data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmPhrase !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/v1/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "DELETE" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to delete account");
      }
      await signOut();
      router.push("/sign-in");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete account",
      );
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessSaved(false);

    // Validate percentage
    const parsedPercent = parseFloat(taxPercent);
    if (isNaN(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      setError(
        "Tax set-aside percent must be a valid number between 0% and 100%",
      );
      return;
    }

    const taxSetAsideBps = Math.round(parsedPercent * 100);

    setSaving(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          defaultCurrency,
          taxSetAsideBps,
          fiscalYearStartMonth: Number(fiscalYearStartMonth),
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to save settings");
      }

      setSuccessSaved(true);
      toast({
        title: "Settings saved",
        description: "Your financial preferences have been updated.",
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Account & Financial Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Customize currency defaults, tax set-aside estimations, and fiscal
          calendars.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {error && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 rounded-xl border p-4 text-sm"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {successSaved && (
          <div
            role="status"
            className="border-income/30 bg-income/10 text-income flex items-center gap-3 rounded-xl border p-4 text-sm"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>Preferences successfully saved and active across all reports.</p>
          </div>
        )}

        {/* General Profile Section */}
        <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
          <div className="border-border flex items-center gap-2.5 border-b pb-3">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Freelancer Profile
              </h2>
              <p className="text-muted-foreground text-xs">
                Your public or display identity on invoices and summaries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="settings-display-name"
                className="text-foreground block text-xs font-medium"
              >
                Display / Business Name
              </label>
              <Input
                id="settings-display-name"
                type="text"
                maxLength={120}
                placeholder="e.g. Alex Morgan Studio"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-10"
              />
            </div>

            {userEmail && (
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-email"
                  className="text-foreground block text-xs font-medium"
                >
                  Account Email
                </label>
                <Input
                  id="settings-email"
                  type="email"
                  disabled
                  value={userEmail}
                  className="bg-muted/50 h-10 cursor-not-allowed opacity-80"
                />
              </div>
            )}
          </div>
        </div>

        {/* Currency & Financial Preferences */}
        <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
          <div className="border-border flex items-center gap-2.5 border-b pb-3">
            <div className="bg-income/10 text-income flex h-8 w-8 items-center justify-center rounded-lg">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Currency & Tax Rate
              </h2>
              <p className="text-muted-foreground text-xs">
                Default currency for quick entry and tax reserve calculations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Default Currency */}
            <div className="space-y-1.5">
              <label
                htmlFor="settings-currency"
                className="text-foreground block text-xs font-medium"
              >
                Default Currency
              </label>
              <select
                id="settings-currency"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Pre-selected currency for newly created transactions.
              </p>
            </div>

            {/* Tax Set-Aside Percent */}
            <div className="space-y-1.5">
              <label
                htmlFor="settings-tax-percent"
                className="text-foreground block text-xs font-medium"
              >
                Estimated Tax Set-Aside Rate (%)
              </label>
              <div className="relative">
                <Input
                  id="settings-tax-percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="15"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  className="h-10 pr-9 tabular-nums"
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Applied to positive net profit on your dashboard (e.g. 15% for
                self-employment tax).
              </p>
            </div>
          </div>
        </div>

        {/* Fiscal Calendar */}
        <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
          <div className="border-border flex items-center gap-2.5 border-b pb-3">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Fiscal Calendar
              </h2>
              <p className="text-muted-foreground text-xs">
                Configure your fiscal year cycle for tax quarters and annual
                statements.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 sm:max-w-md">
            <label
              htmlFor="settings-fiscal-year"
              className="text-foreground block text-xs font-medium"
            >
              Fiscal Year Start Month
            </label>
            <select
              id="settings-fiscal-year"
              value={fiscalYearStartMonth}
              onChange={(e) => setFiscalYearStartMonth(Number(e.target.value))}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Defines Q1–Q4 boundaries for your fiscal tax year.
            </p>
          </div>
        </div>

        {/* Appearance / Theme Section */}
        <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
          <div className="border-border flex items-center gap-2.5 border-b pb-3">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Sun className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Appearance & Theme
              </h2>
              <p className="text-muted-foreground text-xs">
                Choose light, dark, or sync automatically with your device
                theme.
              </p>
            </div>
          </div>

          <div
            aria-label="Theme selection"
            className="grid grid-cols-3 gap-3 sm:max-w-md"
          >
            <button
              type="button"
              aria-pressed={theme === "system"}
              onClick={() => setTheme("system")}
              className={`focus-visible:ring-ring flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all focus-visible:ring-2 focus-visible:outline-none ${
                theme === "system"
                  ? "border-primary bg-primary/10 text-primary ring-primary/30 ring-2"
                  : "border-border bg-surface hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Laptop className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">System</span>
            </button>

            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
              className={`focus-visible:ring-ring flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all focus-visible:ring-2 focus-visible:outline-none ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary ring-primary/30 ring-2"
                  : "border-border bg-surface hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Light</span>
            </button>

            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
              className={`focus-visible:ring-ring flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all focus-visible:ring-2 focus-visible:outline-none ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary ring-primary/30 ring-2"
                  : "border-border bg-surface hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">Dark</span>
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={saving} className="gap-2 shadow-xs">
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Preferences..." : "Save Settings"}</span>
          </Button>
        </div>
      </form>

      {/* Account Data & Portability */}
      <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
        <div className="border-border flex items-center gap-2.5 border-b pb-3">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-semibold">
              Data Portability & Export
            </h2>
            <p className="text-muted-foreground text-xs">
              Download a complete archive of your financial data for backup or
              portability.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              Export All Data (JSON)
            </p>
            <p className="text-muted-foreground max-w-xl text-xs">
              Includes profile settings, categories, clients, projects,
              invoices, recurring rules, and all transactions in a single
              standard JSON file.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{exporting ? "Preparing Export..." : "Download Export"}</span>
          </Button>
        </div>
      </div>

      {/* Progressive Web App (PWA) & Offline Sync */}
      <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
        <div className="border-border flex items-center gap-2.5 border-b pb-3">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-semibold">
              App Installation & Offline Sync
            </h2>
            <p className="text-muted-foreground text-xs">
              Install as a standalone app and view pending offline transactions.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              {canInstall ? "Install App on Device" : "Progressive Web App"}
            </p>
            <p className="text-muted-foreground max-w-xl text-xs">
              {canInstall
                ? "Install Freelancer Finance Tracker for fast launch, offline quick add, and native window experience."
                : "Supports full offline caching and home screen installation via your browser menu (Add to Home Screen)."}
            </p>
          </div>
          {canInstall && (
            <Button
              type="button"
              variant="outline"
              onClick={installApp}
              className="shrink-0 gap-2"
            >
              <Smartphone className="h-4 w-4" />
              <span>Install App</span>
            </Button>
          )}
        </div>

        {pendingCount > 0 && (
          <div className="border-border flex flex-col gap-4 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-foreground text-sm font-medium">
                Offline Queue
              </p>
              <p className="text-muted-foreground max-w-xl text-xs">
                {pendingCount} offline{" "}
                {pendingCount === 1 ? "transaction" : "transactions"} waiting to
                be synchronized with your cloud database.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={syncingOffline}
              onClick={async () => {
                setSyncingOffline(true);
                try {
                  await syncNow();
                } finally {
                  setSyncingOffline(false);
                }
              }}
              className="shrink-0 gap-2"
            >
              {syncingOffline ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              <span>{syncingOffline ? "Syncing..." : "Sync Now"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="border-destructive/30 bg-destructive/5 space-y-4 rounded-xl border p-5 shadow-xs sm:p-6">
        <div className="border-destructive/20 flex items-center gap-2.5 border-b pb-3">
          <div className="bg-destructive/10 text-destructive flex h-8 w-8 items-center justify-center rounded-lg">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-destructive text-base font-semibold">
              Danger Zone
            </h2>
            <p className="text-muted-foreground text-xs">
              Irreversible account actions.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              Delete Account
            </p>
            <p className="text-muted-foreground max-w-xl text-xs">
              Permanently delete your user account, transaction records,
              invoices, projects, clients, and stored receipt files. This cannot
              be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeleteConfirmPhrase("");
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
            className="shrink-0 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Account</span>
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleDeleteAccount}>
            <DialogHeader>
              <div className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <DialogTitle>Delete Account</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                This action is <strong>permanent</strong> and cannot be undone.
                All your clients, projects, invoices, transactions, and uploaded
                receipts will be permanently erased.
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3 text-xs"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{deleteError}</p>
              </div>
            )}

            <div className="space-y-2 py-2">
              <label
                htmlFor="confirm-delete-phrase"
                className="text-foreground block text-xs font-medium"
              >
                To confirm, please type{" "}
                <span className="text-destructive font-bold">DELETE</span>{" "}
                below:
              </label>
              <Input
                id="confirm-delete-phrase"
                value={deleteConfirmPhrase}
                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="border-destructive/40 focus-visible:border-destructive h-10"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteConfirmPhrase !== "DELETE" || deleting}
                className="gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {deleting ? "Deleting Account..." : "Permanently Delete"}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
