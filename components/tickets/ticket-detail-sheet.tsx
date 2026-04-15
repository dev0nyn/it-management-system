"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authFetch, getApiBase, getSessionUser } from "@/lib/api-client";
import { AlertCircle, Pencil, Trash2, X } from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface ApiTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assetId: string | null;
  createdBy: string;
  assigneeId: string | null;
  reporterName: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssigneeOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  ticket: ApiTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (ticket: ApiTicket) => void;
  onDeleted: (id: string) => void;
}

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Infrastructure",
  "Security",
  "Access",
  "Other",
];

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  medium: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  urgent: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const statusColors: Record<TicketStatus, string> = {
  open: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return `T-${id.slice(0, 8).toUpperCase()}`;
}

export function TicketDetailSheet({ ticket, open, onOpenChange, onUpdated, onDeleted }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "open" as TicketStatus,
    priority: "medium" as TicketPriority,
    category: "Hardware",
    assigneeId: null as string | null,
  });

  const sessionUser = getSessionUser();
  const canEdit = sessionUser?.role === "admin" || sessionUser?.role === "it_staff";

  useEffect(() => {
    if (ticket) {
      setForm({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assigneeId: ticket.assigneeId,
      });
      setIsEditing(false);
      setError(null);
    }
  }, [ticket]);

  useEffect(() => {
    if (!isEditing || !canEdit) return;
    authFetch(`${getApiBase()}/api/v1/assets/users`)
      .then((r) => r.json())
      .then((d) => setAssignees(d.data ?? []))
      .catch(() => {});
  }, [isEditing, canEdit]);

  function handleClose(value: boolean) {
    if (!value) {
      setIsEditing(false);
      setError(null);
    }
    onOpenChange(value);
  }

  function cancelEdit() {
    if (!ticket) return;
    setIsEditing(false);
    setError(null);
    setForm({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      assigneeId: ticket.assigneeId,
    });
  }

  async function handleSave() {
    if (!ticket) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await authFetch(`${getApiBase()}/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Failed to save changes.");
        return;
      }
      const { data: updated } = await res.json();
      onUpdated(updated);
      setIsEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!ticket) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`${getApiBase()}/api/v1/tickets/${ticket.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        setError("Failed to delete ticket.");
        return;
      }
      onDeleted(ticket.id);
      handleClose(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (!ticket) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="flex flex-col !w-full sm:!max-w-lg overflow-y-auto">
          {/* ── Header ── */}
          <SheetHeader className="pb-4 pr-10 border-b border-slate-100 dark:border-zinc-800">
            <p className="text-xs font-mono font-semibold text-red-500 dark:text-red-400 mb-1">
              {shortId(ticket.id)}
            </p>
            <SheetTitle className="text-left text-base font-semibold leading-snug text-slate-900 dark:text-white">
              {isEditing ? (
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={120}
                  className="text-base font-semibold rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10"
                />
              ) : (
                ticket.title
              )}
            </SheetTitle>
            {!isEditing && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[ticket.status]}`}>
                  {statusLabels[ticket.status]}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColors[ticket.priority]}`}>
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">
                  {ticket.category}
                </span>
              </div>
            )}
            {canEdit && !isEditing && (
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </SheetHeader>

          {/* ── Body ── */}
          <div className="flex-1 flex flex-col px-4 pb-8 overflow-y-auto">

            {/* Description */}
            <div className="py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Description
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Edit form fields */}
            {isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 pb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TicketStatus }))}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Assignee
                  </label>
                  <select
                    value={form.assigneeId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value || null }))}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Details */}
            {!isEditing && (
              <div className="border-t border-slate-100 dark:border-zinc-800 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                  Details
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      Reporter
                    </dt>
                    <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {ticket.reporterName ?? "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      Assignee
                    </dt>
                    <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {ticket.assigneeName ?? "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      Created
                    </dt>
                    <dd className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(ticket.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      Last updated
                    </dt>
                    <dd className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(ticket.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Edit action buttons */}
            {isEditing && (
              <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-10"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-10"
                >
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete ticket?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{ticket.title}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
