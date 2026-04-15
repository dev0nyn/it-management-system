"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  MoreHorizontal,
  UserCheck,
  ArrowRight,
  Trash2,
  CircleDot,
  Timer,
  CheckCircle2,
  X,
  UserX,
} from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface AssigneeOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  currentStatus: TicketStatus;
  currentAssigneeId: string | null;
  assignees: AssigneeOption[];
  onView: () => void;
  onAssign: (userId: string | null) => void;
  onMoveStatus: (status: TicketStatus) => void;
  onDelete: () => void;
}

const STATUS_OPTIONS: { value: TicketStatus; label: string; icon: React.ElementType }[] = [
  { value: "open", label: "Open", icon: CircleDot },
  { value: "in_progress", label: "In Progress", icon: Timer },
  { value: "resolved", label: "Resolved", icon: CheckCircle2 },
  { value: "closed", label: "Closed", icon: X },
];

export function TicketCardMenu({
  currentStatus,
  currentAssigneeId,
  assignees,
  onView,
  onAssign,
  onMoveStatus,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      {/* Stop both click and pointerdown so the card onClick and dnd-kit
          listeners don't fire when the trigger is pressed */}
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity touch-manipulation"
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={4}
        className="min-w-[170px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
            View details
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Assign to */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCheck className="h-3.5 w-3.5" />
            Assign to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Staff</DropdownMenuLabel>
              {assignees.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  onClick={() => onAssign(a.id)}
                  className={currentAssigneeId === a.id ? "font-semibold" : ""}
                >
                  <span className="h-5 w-5 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-700 dark:text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {a.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  {a.name}
                </DropdownMenuItem>
              ))}
              {assignees.length === 0 && (
                <DropdownMenuItem disabled>No staff found</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            {currentAssigneeId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onAssign(null)}>
                    <UserX className="h-3.5 w-3.5" />
                    Unassign
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Move to */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRight className="h-3.5 w-3.5" />
            Move to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuGroup>
              {STATUS_OPTIONS.filter((s) => s.value !== currentStatus).map((s) => (
                <DropdownMenuItem key={s.value} onClick={() => onMoveStatus(s.value)}>
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
