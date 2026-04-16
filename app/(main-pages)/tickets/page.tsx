"use client";

import { useState, useCallback, useId, useMemo, useRef, useEffect } from "react";
import { TicketSubmitSheet } from "@/components/tickets/ticket-submit-sheet";
import { TicketDetailSheet, type ApiTicket } from "@/components/tickets/ticket-detail-sheet";
import { TicketCardMenu } from "@/components/tickets/ticket-card-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Plus,
  Clock,
  CheckCircle2,
  CircleDot,
  Timer,
  X,
  Users,
  ChevronDown,
  Check,
  RefreshCw,
} from "lucide-react";
import { authFetch, getApiBase, getSessionUser, type SessionUser } from "@/lib/api-client";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

// Alias for local use — same shape as ApiTicket
type Ticket = ApiTicket;

const columns: { id: TicketStatus; title: string; icon: React.ElementType; color: string; bgColor: string; headerBg: string; dotColor: string }[] = [
  { id: "open", title: "Open", icon: CircleDot, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-500/5", headerBg: "bg-amber-500", dotColor: "bg-amber-500" },
  { id: "in_progress", title: "In Progress", icon: Timer, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-500/5", headerBg: "bg-blue-500", dotColor: "bg-blue-500" },
  { id: "resolved", title: "Resolved", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-500/5", headerBg: "bg-emerald-500", dotColor: "bg-emerald-500" },
  { id: "closed", title: "Closed", icon: X, color: "text-slate-500 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-500/5", headerBg: "bg-slate-400", dotColor: "bg-slate-400" },
];

const priorityConfig: Record<TicketPriority, { label: string; className: string; dotColor: string }> = {
  low: { label: "Low", className: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400 border border-slate-200 dark:border-slate-700", dotColor: "bg-slate-400" },
  medium: { label: "Medium", className: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-800", dotColor: "bg-blue-500" },
  high: { label: "High", className: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 border border-orange-200 dark:border-orange-800", dotColor: "bg-orange-500" },
  urgent: { label: "Urgent", className: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200 dark:border-red-800", dotColor: "bg-red-500" },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface TicketCardMenuProps {
  onView: () => void;
  onMoveStatus: (status: TicketStatus) => void;
  onDelete: () => void;
}

// ── Ticket Card ──
function TicketCard({
  ticket,
  isDragging,
  onClick,
  menuProps,
  onAssignToSelf,
  currentUserId,
}: {
  ticket: Ticket;
  isDragging?: boolean;
  onClick?: () => void;
  menuProps?: TicketCardMenuProps;
  onAssignToSelf?: () => void;
  currentUserId?: string;
}) {
  const priority = priorityConfig[ticket.priority];
  const assigneeName = ticket.assigneeName ?? "Unassigned";
  const initials =
    assigneeName === "Unassigned"
      ? "?"
      : assigneeName.split(" ").map((n) => n[0]).join("");

  return (
    <div
      onClick={onClick}
      className={`group rounded-lg border bg-white dark:bg-zinc-900 p-3.5 shadow-sm transition-all duration-200 ${
        isDragging
          ? "shadow-xl ring-2 ring-red-500/30 rotate-[2deg] scale-105 opacity-90"
          : "hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-600 border-slate-200 dark:border-zinc-800"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Top row: ID + Priority + More */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
          T-{ticket.id.slice(0, 8).toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 text-[10px] leading-none font-semibold px-1.5 py-1 rounded ${priority.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priority.dotColor}`} />
            <span className="translate-y-[0.5px]">{priority.label}</span>
          </span>
          {menuProps && (
            <TicketCardMenu
              currentStatus={ticket.status}
              onView={menuProps.onView}
              onMoveStatus={menuProps.onMoveStatus}
              onDelete={menuProps.onDelete}
            />
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug mb-2 line-clamp-2">
        {ticket.title}
      </h4>

      {/* Category tag */}
      <div className="mb-3">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">
          {ticket.category}
        </span>
      </div>

      {/* Bottom row: Assignee + Take button + Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            assigneeName === "Unassigned"
              ? "bg-slate-100 dark:bg-zinc-800 text-slate-400"
              : "bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-700 dark:text-red-400"
          }`}>
            {initials}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
            {assigneeName}
          </span>
          {onAssignToSelf && ticket.assigneeId !== currentUserId && (
            <button
              onClick={(e) => { e.stopPropagation(); onAssignToSelf(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 shrink-0"
            >
              Take
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <span className="text-[10px] flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {formatRelative(ticket.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Ticket Wrapper ──
function SortableTicket({
  ticket,
  onOpen,
  menuProps,
  onAssignToSelf,
  currentUserId,
}: {
  ticket: Ticket;
  onOpen: (t: Ticket) => void;
  menuProps: TicketCardMenuProps;
  onAssignToSelf?: () => void;
  currentUserId?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: { type: "ticket", ticket },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <TicketCard
        ticket={ticket}
        onClick={() => onOpen(ticket)}
        menuProps={menuProps}
        onAssignToSelf={onAssignToSelf}
        currentUserId={currentUserId}
      />
    </div>
  );
}

// ── Kanban Column ──
function KanbanColumn({
  column,
  tickets,
  isOver,
  onOpen,
  onAddTicket,
  getMenuProps,
  onAssignToSelf,
  currentUserId,
}: {
  column: (typeof columns)[number];
  tickets: Ticket[];
  isOver: boolean;
  onOpen: (t: Ticket) => void;
  onAddTicket: () => void;
  getMenuProps: (t: Ticket) => TicketCardMenuProps;
  onAssignToSelf?: (ticketId: string) => void;
  currentUserId?: string;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const ticketIds = tickets.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full h-full rounded-xl transition-all duration-200 ${
        isOver
          ? "ring-2 ring-inset ring-red-500/30 bg-red-50/30 dark:bg-red-500/5"
          : "bg-slate-50/50 dark:bg-zinc-900/50"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${column.dotColor}`} />
          <h3 className={`text-sm font-semibold ${column.color}`}>{column.title}</h3>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {tickets.length}
          </span>
        </div>
        <button
          onClick={onAddTicket}
          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          title="New ticket"
        >
          <Plus className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[150px]">
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicket
              key={ticket.id}
              ticket={ticket}
              onOpen={onOpen}
              menuProps={getMenuProps(ticket)}
              onAssignToSelf={onAssignToSelf ? () => onAssignToSelf(ticket.id) : undefined}
              currentUserId={currentUserId}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed transition-colors ${
            isOver
              ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-500/5"
              : "border-slate-200 dark:border-zinc-800"
          }`}>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {isOver ? "Drop here" : "No tickets"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──
export default function TicketsPage() {
  const dndId = useId();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [submitSheetOpen, setSubmitSheetOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  async function loadTickets() {
    setIsLoading(true);
    try {
      const res = await authFetch(`${getApiBase()}/api/v1/tickets`);
      if (res.ok) {
        const { data } = await res.json();
        setTickets(data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setCurrentUser(getSessionUser());
    loadTickets();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const assignees = useMemo(() => {
    const names = tickets
      .map((t) => t.assigneeName ?? "Unassigned")
      .filter(Boolean);
    const unique = Array.from(new Set(names));
    return unique.sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [tickets]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const filtered = tickets.filter((t) => {
    const assigneeName = t.assigneeName ?? "Unassigned";
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee =
      assigneeFilter === "all" || assigneeName === assigneeFilter;
    return matchesSearch && matchesAssignee;
  });

  const getColumnTickets = useCallback(
    (status: TicketStatus) => filtered.filter((t) => t.status === status),
    [filtered]
  );

  const findTicketById = (id: string) => tickets.find((t) => t.id === id);

  function handleOpenTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setDetailSheetOpen(true);
  }

  function notifyChanged() {
    window.dispatchEvent(new CustomEvent("tickets:changed"));
  }

  function handleTicketUpdated(updated: Ticket) {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTicket(updated);
    notifyChanged();
  }

  function handleTicketDeleted(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setSelectedTicket(null);
    notifyChanged();
  }

  async function handleAssignToSelf(ticketId: string) {
    if (!currentUser) return;
    const prev = tickets;
    setTickets((ts) =>
      ts.map((t) =>
        t.id === ticketId
          ? { ...t, assigneeId: currentUser.id, assigneeName: currentUser.name }
          : t
      )
    );
    const res = await authFetch(`${getApiBase()}/api/v1/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: currentUser.id }),
    });
    if (!res.ok) {
      setTickets(prev);
    } else {
      const { data } = await res.json();
      setTickets((ts) => ts.map((t) => (t.id === data.id ? data : t)));
      notifyChanged();
    }
  }

  async function handleQuickStatus(ticketId: string, status: TicketStatus) {
    const prev = tickets;
    setTickets((ts) => ts.map((t) => (t.id === ticketId ? { ...t, status } : t)));
    const res = await authFetch(`${getApiBase()}/api/v1/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setTickets(prev);
    else {
      const { data } = await res.json();
      setTickets((ts) => ts.map((t) => (t.id === data.id ? data : t)));
      notifyChanged();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`${getApiBase()}/api/v1/tickets/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        handleTicketDeleted(deleteTarget.id);
        notifyChanged();
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const getMenuProps = useCallback(
    (ticket: Ticket): TicketCardMenuProps => ({
      onView: () => handleOpenTicket(ticket),
      onMoveStatus: (status) => handleQuickStatus(ticket.id, status),
      onDelete: () => setDeleteTarget(ticket),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickets]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = findTicketById(event.active.id as string);
    if (ticket) setActiveTicket(ticket);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    const overData = over.data.current;
    if (overData?.type === "ticket") {
      const overTicket = findTicketById(over.id as string);
      setOverColumnId(overTicket?.status ?? null);
    } else {
      setOverColumnId(over.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    setOverColumnId(null);

    if (!over) return;

    const activeId = active.id as string;
    let targetStatus: TicketStatus | null = null;

    const overData = over.data.current;
    if (overData?.type === "ticket") {
      const overTicket = findTicketById(over.id as string);
      if (overTicket) targetStatus = overTicket.status;
    } else {
      const colId = over.id as string;
      if (columns.some((c) => c.id === colId)) {
        targetStatus = colId as TicketStatus;
      }
    }

    if (!targetStatus) return;

    const prevTickets = tickets;
    setTickets((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t))
    );

    // Persist to API (optimistic — revert on failure)
    authFetch(`${getApiBase()}/api/v1/tickets/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    }).then((res) => {
      if (!res.ok) {
        setTickets(prevTickets);
      } else {
        res.json().then(({ data }) => {
          setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)));
          notifyChanged();
        });
      }
    }).catch(() => {
      setTickets(prevTickets);
    });
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 pt-6 min-h-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Board
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag tickets between columns to update status · click to view details
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-full sm:w-[220px] rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-sm"
            />
          </div>

          {/* Assignee Filter */}
          <div ref={filterRef} className="relative" id="assignee-filter">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-all duration-200 w-full sm:w-auto justify-between sm:justify-start cursor-pointer ${
                assigneeFilter !== "all"
                  ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 shadow-sm shadow-red-500/10"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-zinc-700"
              }`}
            >

              <Users className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">
                {assigneeFilter === "all" ? "All Assignees" : assigneeFilter}
              </span>
              {assigneeFilter !== "all" && (
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white shrink-0">
                  1
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 right-0 sm:right-auto top-full mt-1.5 z-50 sm:w-[220px] rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl shadow-black/10 dark:shadow-black/30 py-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5">
                    Filter by assignee
                  </p>
                </div>

                <div className="max-h-[240px] overflow-y-auto">
                  <button
                    onClick={() => { setAssigneeFilter("all"); setFilterOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors cursor-pointer ${
                      assigneeFilter === "all"
                        ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Users className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="font-medium">All Assignees</span>
                    {assigneeFilter === "all" && (
                      <Check className="h-4 w-4 ml-auto text-red-500 shrink-0" />
                    )}
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-zinc-800 mx-2 my-1" />

                  {assignees.map((assignee) => {
                    const isUnassigned = assignee === "Unassigned";
                    const initials = isUnassigned ? "?" : assignee.split(" ").map((n) => n[0]).join("");
                    const ticketCount = tickets.filter((t) => (t.assigneeName ?? "Unassigned") === assignee).length;

                    return (
                      <button
                        key={assignee}
                        onClick={() => { setAssigneeFilter(assignee); setFilterOpen(false); }}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors cursor-pointer ${
                          assigneeFilter === assignee
                            ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isUnassigned
                            ? "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                            : "bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-700 dark:text-red-400"
                        }`}>
                          {initials}
                        </div>
                        <span className="font-medium truncate">{assignee}</span>
                        <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          assigneeFilter === assignee
                            ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400"
                        }`}>
                          {ticketCount}
                        </span>
                        {assigneeFilter === assignee && (
                          <Check className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {assigneeFilter !== "all" && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-zinc-800 mx-2 my-1" />
                    <button
                      onClick={() => { setAssigneeFilter("all"); setFilterOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Clear filter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTickets}
              disabled={isLoading}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <Button
              onClick={() => setSubmitSheetOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all rounded-lg h-9 px-4 text-sm flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Ticket
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && tickets.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading tickets…</span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {(!isLoading || tickets.length > 0) && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4 min-h-0 snap-x snap-mandatory sm:snap-none">
            {columns.map((column) => {
              const columnTickets = getColumnTickets(column.id);
              return (
                <SortableContext key={column.id} id={column.id} items={columnTickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="snap-start shrink-0 sm:shrink sm:flex-1 min-w-[85vw] sm:min-w-[280px] sm:max-w-[320px]">
                    <KanbanColumn
                      column={column}
                      tickets={columnTickets}
                      isOver={overColumnId === column.id}
                      onOpen={handleOpenTicket}
                      onAddTicket={() => setSubmitSheetOpen(true)}
                      getMenuProps={getMenuProps}
                      onAssignToSelf={
                        currentUser && ["admin", "it_staff"].includes(currentUser.role)
                          ? handleAssignToSelf
                          : undefined
                      }
                      currentUserId={currentUser?.id}
                    />
                  </div>
                </SortableContext>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeTicket ? <TicketCard ticket={activeTicket} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TicketSubmitSheet
        open={submitSheetOpen}
        onOpenChange={setSubmitSheetOpen}
        onSuccess={() => { loadTickets(); notifyChanged(); }}
      />

      <TicketDetailSheet
        ticket={selectedTicket}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onUpdated={handleTicketUpdated}
        onDeleted={handleTicketDeleted}
      />

      {/* Quick-delete confirmation (from card menu) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete ticket?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
