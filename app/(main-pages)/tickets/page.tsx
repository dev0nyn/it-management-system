"use client";

import { useState, useCallback, useId, useMemo, useRef, useEffect } from "react";
import { TicketSubmitSheet } from "@/components/tickets/ticket-submit-sheet";

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
  MoreHorizontal,
  Users,
  ChevronDown,
  Check,
} from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  category: string;
}

const initialTickets: Ticket[] = [
  { id: "T-1032", title: "Email server not responding", description: "Production email server down since 9 AM", status: "open", priority: "urgent", assignee: "Mike Chen", reporter: "Sarah Wilson", created: "30m ago", updated: "5m ago", category: "Infrastructure" },
  { id: "T-1031", title: "New laptop setup for Marketing", description: "Need 3 laptops configured for new hires", status: "in_progress", priority: "medium", assignee: "Alex Kim", reporter: "HR Department", created: "2h ago", updated: "45m ago", category: "Hardware" },
  { id: "T-1030", title: "VPN access for remote team", description: "Configure VPN access for 5 remote developers", status: "in_progress", priority: "high", assignee: "Mike Chen", reporter: "Dev Team Lead", created: "4h ago", updated: "1h ago", category: "Network" },
  { id: "T-1029", title: "Broken monitor in Room 101", description: "Dell monitor showing no signal", status: "open", priority: "low", assignee: "Unassigned", reporter: "j.smith@company.com", created: "6h ago", updated: "6h ago", category: "Hardware" },
  { id: "T-1028", title: "Software license renewal", description: "Adobe Creative Suite licenses expiring next week", status: "open", priority: "high", assignee: "Alex Kim", reporter: "Design Team", created: "1d ago", updated: "3h ago", category: "Software" },
  { id: "T-1027", title: "Printer jam on 3rd floor", description: "HP LaserJet keeps jamming", status: "resolved", priority: "low", assignee: "Jess Park", reporter: "m.doe@company.com", created: "1d ago", updated: "8h ago", category: "Hardware" },
  { id: "T-1026", title: "Database backup failure", description: "Nightly backup job failed with timeout error", status: "resolved", priority: "urgent", assignee: "Mike Chen", reporter: "Monitoring System", created: "2d ago", updated: "1d ago", category: "Infrastructure" },
  { id: "T-1025", title: "Password reset request", description: "User locked out of account", status: "closed", priority: "low", assignee: "Alex Kim", reporter: "s.taylor@company.com", created: "2d ago", updated: "2d ago", category: "Access" },
  { id: "T-1024", title: "Network switch replacement", description: "Switch in Server Room B showing intermittent failures", status: "in_progress", priority: "high", assignee: "Jess Park", reporter: "Network Monitor", created: "3d ago", updated: "12h ago", category: "Network" },
  { id: "T-1023", title: "Install antivirus on new machines", description: "10 new workstations need endpoint protection", status: "closed", priority: "medium", assignee: "Jess Park", reporter: "IT Manager", created: "4d ago", updated: "3d ago", category: "Security" },
];

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

// ── Ticket Card (Draggable) ──
function TicketCard({ ticket, isDragging }: { ticket: Ticket; isDragging?: boolean }) {
  const priority = priorityConfig[ticket.priority];
  const initials = ticket.assignee === "Unassigned"
    ? "?"
    : ticket.assignee.split(" ").map((n) => n[0]).join("");

  return (
    <div
      className={`group rounded-lg border bg-white dark:bg-zinc-900 p-3.5 shadow-sm transition-all duration-200 ${
        isDragging
          ? "shadow-xl ring-2 ring-red-500/30 rotate-[2deg] scale-105 opacity-90"
          : "hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-600 border-slate-200 dark:border-zinc-800"
      }`}
    >
      {/* Top row: ID + Priority + More */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">{ticket.id}</span>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 text-[10px] leading-none font-semibold px-1.5 py-1 rounded ${priority.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priority.dotColor}`} />
            <span className="translate-y-[0.5px]">{priority.label}</span>
          </span>
          <button className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
          </button>
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

      {/* Bottom row: Assignee + Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            ticket.assignee === "Unassigned"
              ? "bg-slate-100 dark:bg-zinc-800 text-slate-400"
              : "bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-700 dark:text-red-400"
          }`}>
            {initials}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
            {ticket.assignee}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <span className="text-[10px] flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {ticket.created}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Ticket Wrapper ──
function SortableTicket({ ticket }: { ticket: Ticket }) {
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
      <TicketCard ticket={ticket} />
    </div>
  );
}

// ── Kanban Column ──
function KanbanColumn({
  column,
  tickets,
  isOver,
}: {
  column: (typeof columns)[number];
  tickets: Ticket[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const ticketIds = tickets.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] max-w-[320px] shrink-0 w-full rounded-xl transition-all duration-200 ${
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
        <button className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
          <Plus className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[150px]">
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicket key={ticket.id} ticket={ticket} />
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
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [submitSheetOpen, setSubmitSheetOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive unique assignees from ticket data
  const assignees = useMemo(() => {
    const unique = Array.from(new Set(tickets.map((t) => t.assignee)));
    // Sort: "Unassigned" last, rest alphabetical
    return unique.sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [tickets]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee =
      assigneeFilter === "all" || t.assignee === assigneeFilter;
    return matchesSearch && matchesAssignee;
  });

  const getColumnTickets = useCallback(
    (status: TicketStatus) => filtered.filter((t) => t.status === status),
    [filtered]
  );

  const findTicketById = (id: string) => tickets.find((t) => t.id === id);

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

    // Determine which column we're over
    const overData = over.data.current;
    if (overData?.type === "ticket") {
      // Over a ticket — find its column
      const overTicket = findTicketById(over.id as string);
      setOverColumnId(overTicket?.status ?? null);
    } else {
      // Over a column directly
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

    // Determine target column
    const overData = over.data.current;
    if (overData?.type === "ticket") {
      const overTicket = findTicketById(over.id as string);
      if (overTicket) targetStatus = overTicket.status;
    } else {
      // Dropped on column container
      const colId = over.id as string;
      if (columns.some((c) => c.id === colId)) {
        targetStatus = colId as TicketStatus;
      }
    }

    if (!targetStatus) return;

    setTickets((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t))
    );
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
            Drag tickets between columns to update status
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-full sm:w-[220px] rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-sm"
            />
          </div>

          {/* Assignee Filter Dropdown */}
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
              <span className="truncate max-w-[120px]">
                {assigneeFilter === "all" ? "All Assignees" : assigneeFilter}
              </span>
              {assigneeFilter !== "all" && (
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white shrink-0">
                  1
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Panel */}
            {filterOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-[220px] rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl shadow-black/10 dark:shadow-black/30 py-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5">
                    Filter by assignee
                  </p>
                </div>

                <div className="max-h-[240px] overflow-y-auto">
                  {/* All Assignees option */}
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

                  {/* Individual assignees */}
                  {assignees.map((assignee) => {
                    const isUnassigned = assignee === "Unassigned";
                    const initials = isUnassigned
                      ? "?"
                      : assignee.split(" ").map((n) => n[0]).join("");
                    const ticketCount = tickets.filter((t) => t.assignee === assignee).length;

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

                {/* Clear filter footer */}
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

          <Button
            onClick={() => setSubmitSheetOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all rounded-lg h-9 px-4 text-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 min-h-0">
          {columns.map((column) => {
            const columnTickets = getColumnTickets(column.id);
            return (
              <SortableContext key={column.id} id={column.id} items={columnTickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <KanbanColumn
                  column={column}
                  tickets={columnTickets}
                  isOver={overColumnId === column.id}
                />
              </SortableContext>
            );
          })}
        </div>

        {/* Drag Overlay — shows a floating preview of the dragged card */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeTicket ? <TicketCard ticket={activeTicket} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <TicketSubmitSheet
        open={submitSheetOpen}
        onOpenChange={setSubmitSheetOpen}
      />
    </div>
  );
}
