"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Users,
  Briefcase,
  AlertCircle,
  Mail,
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
import type { ClientDto } from "@/lib/schemas/clients";
import type { ProjectDto } from "@/lib/schemas/projects";

export function ClientsProjectsManager() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<"clients" | "projects">(
    "clients",
  );
  const [includeArchived, setIncludeArchived] = React.useState(false);

  const [clients, setClients] = React.useState<ClientDto[]>([]);
  const [projects, setProjects] = React.useState<ProjectDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Project filtering by client
  const [projectClientFilter, setProjectClientFilter] =
    React.useState<string>("");

  // Client Dialog state
  const [clientDialogOpen, setClientDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientDto | null>(
    null,
  );
  const [clientName, setClientName] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [clientNotes, setClientNotes] = React.useState("");
  const [clientFormSubmitting, setClientFormSubmitting] = React.useState(false);
  const [clientFormError, setClientFormError] = React.useState<string | null>(
    null,
  );

  // Project Dialog state
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectDto | null>(
    null,
  );
  const [projectName, setProjectName] = React.useState("");
  const [projectClientId, setProjectClientId] = React.useState<string>("");
  const [projectFormSubmitting, setProjectFormSubmitting] =
    React.useState(false);
  const [projectFormError, setProjectFormError] = React.useState<string | null>(
    null,
  );

  // In-use 409 Conflict prompt
  const [archivePrompt, setArchivePrompt] = React.useState<{
    type: "client" | "project";
    id: string;
    name: string;
    message: string;
  } | null>(null);

  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const archivedParam = includeArchived ? "true" : "false";

        const [clientsRes, projectsRes] = await Promise.all([
          fetch(`/api/v1/clients?includeArchived=${archivedParam}`).then((r) =>
            r.json(),
          ),
          fetch(`/api/v1/projects?includeArchived=${archivedParam}`).then((r) =>
            r.json(),
          ),
        ]);

        if (!ignore) {
          if (clientsRes?.data) setClients(clientsRes.data);
          if (projectsRes?.data) setProjects(projectsRes.data);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load data");
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

  // Client actions
  const openCreateClient = () => {
    setEditingClient(null);
    setClientName("");
    setClientEmail("");
    setClientNotes("");
    setClientFormError(null);
    setClientDialogOpen(true);
  };

  const openEditClient = (client: ClientDto) => {
    setEditingClient(client);
    setClientName(client.name);
    setClientEmail(client.email || "");
    setClientNotes(client.notes || "");
    setClientFormError(null);
    setClientDialogOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setClientFormError("Client name cannot be empty");
      return;
    }

    setClientFormSubmitting(true);
    setClientFormError(null);

    try {
      const endpoint = editingClient
        ? `/api/v1/clients/${editingClient.id}`
        : "/api/v1/clients";
      const method = editingClient ? "PATCH" : "POST";
      const payload = {
        name: clientName.trim(),
        email: clientEmail.trim() || null,
        notes: clientNotes.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        setClientFormError(body.error?.message || "Failed to save client");
        setClientFormSubmitting(false);
        return;
      }

      toast({
        title: editingClient ? "Client updated" : "Client created",
        description: `"${body.data.name}" has been saved.`,
        variant: "success",
      });

      setClientDialogOpen(false);
      triggerRefresh();
    } catch {
      setClientFormError("Network error. Please try again.");
    } finally {
      setClientFormSubmitting(false);
    }
  };

  const handleToggleArchiveClient = async (client: ClientDto) => {
    const isArchived = client.archivedAt !== null;
    try {
      const res = await fetch(`/api/v1/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !isArchived }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to update client");
      }

      toast({
        title: isArchived ? "Client restored" : "Client archived",
        description: `"${client.name}" is now ${isArchived ? "active" : "archived"}.`,
        variant: "success",
      });
      triggerRefresh();
    } catch (err) {
      toast({
        title: "Action failed",
        description:
          err instanceof Error ? err.message : "Error updating client",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (client: ClientDto) => {
    try {
      const res = await fetch(`/api/v1/clients/${client.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const body = await res.json();
        setArchivePrompt({
          type: "client",
          id: client.id,
          name: client.name,
          message:
            body.error?.message ||
            "This client has linked transactions or projects and cannot be deleted. Archive instead to preserve historical records.",
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete client");
      }

      toast({
        title: "Client deleted",
        description: `"${client.name}" was permanently removed.`,
        variant: "success",
      });
      triggerRefresh();
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Error deleting client",
        variant: "destructive",
      });
    }
  };

  // Project actions
  const openCreateProject = () => {
    setEditingProject(null);
    setProjectName("");
    setProjectClientId(projectClientFilter || "");
    setProjectFormError(null);
    setProjectDialogOpen(true);
  };

  const openEditProject = (project: ProjectDto) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectClientId(project.clientId || "");
    setProjectFormError(null);
    setProjectDialogOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setProjectFormError("Project name cannot be empty");
      return;
    }

    setProjectFormSubmitting(true);
    setProjectFormError(null);

    try {
      const endpoint = editingProject
        ? `/api/v1/projects/${editingProject.id}`
        : "/api/v1/projects";
      const method = editingProject ? "PATCH" : "POST";
      const payload = {
        name: projectName.trim(),
        clientId: projectClientId || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        setProjectFormError(body.error?.message || "Failed to save project");
        setProjectFormSubmitting(false);
        return;
      }

      toast({
        title: editingProject ? "Project updated" : "Project created",
        description: `"${body.data.name}" has been saved.`,
        variant: "success",
      });

      setProjectDialogOpen(false);
      triggerRefresh();
    } catch {
      setProjectFormError("Network error. Please try again.");
    } finally {
      setProjectFormSubmitting(false);
    }
  };

  const handleToggleArchiveProject = async (project: ProjectDto) => {
    const isArchived = project.archivedAt !== null;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !isArchived }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to update project");
      }

      toast({
        title: isArchived ? "Project restored" : "Project archived",
        description: `"${project.name}" is now ${isArchived ? "active" : "archived"}.`,
        variant: "success",
      });
      triggerRefresh();
    } catch (err) {
      toast({
        title: "Action failed",
        description:
          err instanceof Error ? err.message : "Error updating project",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (project: ProjectDto) => {
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const body = await res.json();
        setArchivePrompt({
          type: "project",
          id: project.id,
          name: project.name,
          message:
            body.error?.message ||
            "This project is linked to transactions and cannot be deleted. Archive instead to preserve historical records.",
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete project");
      }

      toast({
        title: "Project deleted",
        description: `"${project.name}" was permanently removed.`,
        variant: "success",
      });
      triggerRefresh();
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Error deleting project",
        variant: "destructive",
      });
    }
  };

  // Filter projects by client dropdown
  const filteredProjects = projects.filter((p) => {
    if (!projectClientFilter) return true;
    return p.clientId === projectClientFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Clients & Projects
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your client accounts and associate freelance projects.
          </p>
        </div>

        <Button
          onClick={
            activeTab === "clients" ? openCreateClient : openCreateProject
          }
          className="gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>{activeTab === "clients" ? "New Client" : "New Project"}</span>
        </Button>
      </div>

      {/* Tabs & Include Archived Bar */}
      <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-xs">
        {/* Active View Switcher */}
        <div
          aria-label="Clients and projects views"
          className="flex items-center gap-1"
        >
          <button
            type="button"
            aria-pressed={activeTab === "clients"}
            onClick={() => setActiveTab("clients")}
            className={cn(
              "focus-visible:ring-ring flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeTab === "clients"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clients ({clients.length})</span>
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
            className={cn(
              "focus-visible:ring-ring flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeTab === "projects"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Projects ({projects.length})</span>
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
          <span>Show archived records</span>
        </label>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading data" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <Button variant="outline" size="sm" onClick={triggerRefresh}>
            Retry
          </Button>
        </div>
      ) : activeTab === "clients" ? (
        /* Clients List */
        clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients found"
            description="Add your first client to start attributing revenue and projects."
            action={
              <Button size="sm" onClick={openCreateClient} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Add Client</span>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const isArchived = client.archivedAt !== null;
              const clientProjects = projects.filter(
                (p) => p.clientId === client.id,
              );

              return (
                <div
                  key={client.id}
                  data-testid={`client-card-${client.id}`}
                  className={cn(
                    "border-border bg-surface group flex flex-col justify-between rounded-xl border p-4 shadow-xs transition-colors",
                    isArchived && "bg-muted/30 opacity-60",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-foreground truncate text-sm font-semibold">
                            {client.name}
                          </h3>
                          {isArchived && (
                            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                              Archived
                            </span>
                          )}
                        </div>

                        {client.email && (
                          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{client.email}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {client.notes && (
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                        {client.notes}
                      </p>
                    )}
                  </div>

                  <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground text-xs">
                      {clientProjects.length}{" "}
                      {clientProjects.length === 1 ? "project" : "projects"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditClient(client)}
                        aria-label={`Edit ${client.name}`}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-7 sm:w-7"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchiveClient(client)}
                        aria-label={
                          isArchived
                            ? `Restore ${client.name}`
                            : `Archive ${client.name}`
                        }
                        title={isArchived ? "Restore client" : "Archive client"}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-7 sm:w-7"
                      >
                        {isArchived ? (
                          <RotateCcw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client)}
                        aria-label={`Delete ${client.name}`}
                        title="Delete client"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-7 sm:w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Projects Section */
        <div className="space-y-4">
          {/* Project Client Filter */}
          {clients.length > 0 && (
            <div className="flex max-w-xs items-center gap-2">
              <label
                htmlFor="filter-project-client"
                className="text-muted-foreground shrink-0 text-xs font-medium"
              >
                Client:
              </label>
              <select
                id="filter-project-client"
                aria-label="Filter projects by client"
                value={projectClientFilter}
                onChange={(e) => setProjectClientFilter(e.target.value)}
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
          )}

          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No projects found"
              description="Create projects to organize milestones and track deliverables."
              action={
                <Button size="sm" onClick={openCreateProject} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Project</span>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const isArchived = project.archivedAt !== null;
                const client = clients.find((c) => c.id === project.clientId);

                return (
                  <div
                    key={project.id}
                    data-testid={`project-card-${project.id}`}
                    className={cn(
                      "border-border bg-surface group flex items-center justify-between rounded-xl border p-4 shadow-xs transition-colors",
                      isArchived && "bg-muted/30 opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground truncate text-sm font-semibold">
                          {project.name}
                        </h3>
                        {isArchived && (
                          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                            Archived
                          </span>
                        )}
                      </div>

                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {client ? client.name : "Unassigned Client"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditProject(project)}
                        aria-label={`Edit project ${project.name}`}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchiveProject(project)}
                        aria-label={
                          isArchived
                            ? `Restore project ${project.name}`
                            : `Archive project ${project.name}`
                        }
                        title={
                          isArchived ? "Restore project" : "Archive project"
                        }
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
                      >
                        {isArchived ? (
                          <RotateCcw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project)}
                        aria-label={`Delete project ${project.name}`}
                        title="Delete project"
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
        </div>
      )}

      {/* Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent sheetOnMobile>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Update client details and contact information."
                : "Add a client to assign to invoices and transactions."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-4">
            {clientFormError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs font-medium"
              >
                {clientFormError}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="client-name"
                className="text-foreground block text-xs font-medium"
              >
                Client Name
              </label>
              <Input
                id="client-name"
                type="text"
                placeholder="e.g. Acme Corp, Jane Smith"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="client-email"
                className="text-foreground block text-xs font-medium"
              >
                Email{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <Input
                id="client-email"
                type="email"
                placeholder="billing@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="client-notes"
                className="text-foreground block text-xs font-medium"
              >
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <textarea
                id="client-notes"
                rows={3}
                placeholder="Tax ID, payment terms, or contact details..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-surface w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClientDialogOpen(false)}
                disabled={clientFormSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={clientFormSubmitting}>
                {clientFormSubmitting
                  ? "Saving..."
                  : editingClient
                    ? "Save Changes"
                    : "Create Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent sheetOnMobile>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "New Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update project name or assigned client."
                : "Create a project to group milestones and transactions."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProject} className="space-y-4">
            {projectFormError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs font-medium"
              >
                {projectFormError}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="project-name"
                className="text-foreground block text-xs font-medium"
              >
                Project Name
              </label>
              <Input
                id="project-name"
                type="text"
                placeholder="e.g. Website Redesign, Brand Strategy"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="project-client"
                className="text-foreground block text-xs font-medium"
              >
                Client{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <select
                id="project-client"
                value={projectClientId}
                onChange={(e) => setProjectClientId(e.target.value)}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2"
              >
                <option value="">No Client (Internal project)</option>
                {clients
                  .filter((c) => c.archivedAt === null)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProjectDialogOpen(false)}
                disabled={projectFormSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={projectFormSubmitting}>
                {projectFormSubmitting
                  ? "Saving..."
                  : editingProject
                    ? "Save Changes"
                    : "Create Project"}
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
            <DialogTitle>Item In Use</DialogTitle>
            <DialogDescription>{archivePrompt?.message}</DialogDescription>
          </DialogHeader>

          <div className="border-border bg-muted/40 space-y-2 rounded-xl border p-4 text-xs">
            <p className="text-foreground font-medium">
              Why archive instead of deleting?
            </p>
            <p className="text-muted-foreground">
              Archiving hides &quot;{archivePrompt?.name}&quot; from new
              transaction drop-downs while protecting your past financial
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
              onClick={async () => {
                if (archivePrompt) {
                  const { type, id } = archivePrompt;
                  setArchivePrompt(null);
                  if (type === "client") {
                    const client = clients.find((c) => c.id === id);
                    if (client) handleToggleArchiveClient(client);
                  } else {
                    const project = projects.find((p) => p.id === id);
                    if (project) handleToggleArchiveProject(project);
                  }
                }
              }}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              <span>Archive Instead</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
