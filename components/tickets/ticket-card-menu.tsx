"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  MoreHorizontal,
  ArrowRight,
  Trash2,
  CircleDot,
  Timer,
  CheckCircle2,
  X,
} from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Props {
  currentStatus: TicketStatus;
  onView: () => void;
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
  onView,
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
        className="min-w-[160px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
            View details
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

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
