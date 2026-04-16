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
import { AlertCircle, Clock, Pencil, Trash2, X } from "lucide-react";

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

interface TicketEvent {
  id: string;
  ticketId: string;
  actorId: string | null;
  actorName: string | null;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
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

const EVENT_STYLE: Record<string, { dot: string; text: string; line: string }> = {
  ticket_created: {
    dot: "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    line: "border-emerald-200 dark:border-emerald-500/30",
  },
  status_changed: {
    dot: "bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    line: "border-blue-200 dark:border-blue-500/30",
  },
  priority_changed: {
    dot: "bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    line: "border-amber-200 dark:border-amber-500/30",
  },
  category_changed: {
    dot: "bg-violet-500 ring-4 ring-violet-100 dark:ring-violet-500/20",
    text: "text-violet-700 dark:text-violet-400",
    line: "border-violet-200 dark:border-violet-500/30",
  },
  assigned: {
    dot: "bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-400",
    line: "border-indigo-200 dark:border-indigo-500/30",
  },
  unassigned: {
    dot: "bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    line: "border-slate-200 dark:border-zinc-700",
  },
  updated: {
    dot: "bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    line: "border-slate-200 dark:border-zinc-700",
  },
};

function getEventStyle(eventType: string) {
  return EVENT_STYLE[eventType] ?? {
    dot: "bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    line: "border-slate-200 dark:border-zinc-700",
  };
}

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

const STATUS_CHIP: Record<string, string> = {
  open:        "bg-amber-100   text-amber-700   dark:bg-amber-500/20   dark:text-amber-400",
  in_progress: "bg-blue-100    text-blue-700    dark:bg-blue-500/20    dark:text-blue-400",
  resolved:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  closed:      "bg-slate-100   text-slate-600   dark:bg-slate-500/20   dark:text-slate-400",
};

const PRIORITY_CHIP: Record<string, string> = {
  low:    "bg-slate-100   text-slate-600   dark:bg-slate-500/20   dark:text-slate-400",
  medium: "bg-blue-100    text-blue-700    dark:bg-blue-500/20    dark:text-blue-400",
  high:   "bg-orange-100  text-orange-700  dark:bg-orange-500/20  dark:text-orange-400",
  urgent: "bg-red-100     text-red-700     dark:bg-red-500/20     dark:text-red-400",
};

function Chip({ value, map }: { value: string; map: Record<string, string> }) {
  const cap = (s: string) => s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);
  const cls = map[value] ?? "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide mx-0.5 ${cls}`}>
      {cap(value)}
    </span>
  );
}

function Name({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide mx-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
      {value}
    </span>
  );
}

function EventLabel({ event }: { event: TicketEvent }) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  switch (event.eventType) {
    case "ticket_created":
      return <span>Ticket created</span>;
    case "status_changed":
      return (
        <span>
          Status changed from
          <Chip value={event.oldValue ?? ""} map={STATUS_CHIP} />
          to
          <Chip value={event.newValue ?? ""} map={STATUS_CHIP} />
        </span>
      );
    case "priority_changed":
      return (
        <span>
          Priority changed from
          <Chip value={event.oldValue ?? ""} map={PRIORITY_CHIP} />
          to
          <Chip value={event.newValue ?? ""} map={PRIORITY_CHIP} />
        </span>
      );
    case "category_changed":
      return (
        <span>
          Category changed from
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide mx-0.5 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
            {event.oldValue}
          </span>
          to
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide mx-0.5 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
            {event.newValue}
          </span>
        </span>
      );
    case "assigned":
      return event.oldValue ? (
        <span>
          Reassigned from <Name value={event.oldValue} /> to <Name value={event.newValue ?? "unknown"} />
        </span>
      ) : (
        <span>
          Assigned to <Name value={event.newValue ?? "unknown"} />
        </span>
      );
    case "unassigned":
      return (
        <span>
          Unassigned{event.oldValue ? <> from <Name value={event.oldValue} /></> : null}
        </span>
      );
    case "updated":
      return <span>Details updated</span>;
    default:
      return <span>{cap(event.eventType.replace(/_/g, " "))}</span>;
  }
}

export function TicketDetailSheet({ ticket, open, onOpenChange, onUpdated, onDeleted }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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
      loadEvents(ticket.id);
    }
  }, [ticket]);

  async function loadEvents(ticketId: string) {
    setEventsLoading(true);
    try {
      const res = await authFetch(`${getApiBase()}/api/v1/tickets/${ticketId}/events`);
      if (res.ok) {
        const { data } = await res.json();
        setEvents(data ?? []);
      }
    } catch {
      // non-critical; swallow silently
    } finally {
      setEventsLoading(false);
    }
  }

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
      loadEvents(ticket.id);
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
        <SheetContent side="right" className="flex flex-col !w-full sm:!max-w-lg overflow-hidden">
          {/* ── Header ── */}
          <SheetHeader className="shrink-0 pb-4 pr-10 border-b border-slate-100 dark:border-zinc-800">
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

          {/* ── Scrollable top content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4">

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
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2.5 mb-4">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Edit action buttons */}
            {isEditing && (
              <div className="flex gap-2 pb-5 border-t border-slate-100 dark:border-zinc-800 pt-4">
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

          {/* ── Activity panel — own scroll zone ── */}
          {!isEditing && (
            <div className="shrink-0 flex flex-col border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/70">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-zinc-700/80">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-500/15">
                    <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Activity Log
                  </span>
                </div>
                {events.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    {events.length} {events.length === 1 ? "event" : "events"}
                  </span>
                )}
              </div>

              {/* Scrollable events */}
              <div className="overflow-y-auto max-h-56 px-4 py-3">
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="mt-0.5 h-3 w-3 rounded-full bg-slate-200 dark:bg-zinc-700 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-slate-200 dark:bg-zinc-700 rounded w-3/4" />
                          <div className="h-2.5 bg-slate-100 dark:bg-zinc-800 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                    <Clock className="h-6 w-6 text-slate-300 dark:text-zinc-600" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">No activity recorded yet.</p>
                  </div>
                ) : (
                  <ol className="relative border-l-2 border-slate-200 dark:border-zinc-700 ml-1.5">
                    {events.map((event) => {
                      const style = getEventStyle(event.eventType);
                      return (
                        <li key={event.id} className="ml-5 pb-4 last:pb-1">
                          <div className={`absolute -left-[9px] mt-0.5 h-4 w-4 rounded-full ${style.dot}`} />
                          <p className="text-[13px] font-semibold leading-snug text-slate-900 dark:text-white">
                            <EventLabel event={event} />
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              {event.actorName ?? "System"}
                            </span>
                            {" · "}
                            {formatDate(event.createdAt)}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}
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
