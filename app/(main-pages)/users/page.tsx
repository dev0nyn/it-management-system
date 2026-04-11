"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  Wrench,
  User as UserIcon,
  Mail,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { ApiUser, UserFormSheet } from "@/components/users/user-form-sheet";

const roleConfig = {
  admin: {
    label: "Admin",
    icon: Shield,
    className:
      "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
  },
  it_staff: {
    label: "IT Staff",
    icon: Wrench,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  },
  end_user: {
    label: "End User",
    icon: UserIcon,
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20",
  },
};

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<ApiUser | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);

    fetch(`/api/v1/users?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setUsers(data.data ?? []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, refetchTrigger]);

  function triggerRefetch() {
    setRefetchTrigger((n) => n + 1);
  }

  function openCreateSheet() {
    setSheetMode("create");
    setEditTarget(undefined);
    setSheetOpen(true);
  }

  function openEditSheet(user: ApiUser) {
    setSheetMode("edit");
    setEditTarget(user);
    setSheetOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/v1/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setDeleteError("Failed to delete user. Please try again.");
        return;
      }
      setDeleteTarget(null);
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        triggerRefetch();
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: UserIcon,
    },
    {
      label: "Admins",
      value: users.filter((u) => u.role === "admin").length,
      icon: Shield,
    },
    {
      label: "IT Staff",
      value: users.filter((u) => u.role === "it_staff").length,
      icon: Wrench,
    },
    {
      label: "End Users",
      value: users.filter((u) => u.role === "end_user").length,
      icon: UserIcon,
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Users
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Button
          onClick={openCreateSheet}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <stat.icon className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-7 w-8 mb-1 rounded" />
                ) : (
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">
                    {stat.value}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[1fr_120px_160px_44px] gap-4 px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>User</span>
          <span>Role</span>
          <span>Created</span>
          <span />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
                <Skeleton className="h-4 w-24 rounded hidden lg:block" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
              {debouncedSearch
                ? `No users match "${debouncedSearch}".`
                : "No users found."}
            </div>
          ) : (
            users.map((user) => {
              const role = roleConfig[user.role];
              const RoleIcon = role.icon;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_120px_160px_44px] gap-2 lg:gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        {user.email}
                      </p>
                    </div>
                    {/* Role badge — visible on mobile, hidden on desktop (shown in its own column) */}
                    <span
                      className={`lg:hidden inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border shrink-0 ${role.className}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      <span className="hidden sm:inline">{role.label}</span>
                    </span>
                    {/* Actions — visible on mobile only */}
                    <div className="lg:hidden shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSheet(user)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Role column — desktop only */}
                  <div className="hidden lg:flex items-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${role.className}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {role.label}
                    </span>
                  </div>

                  {/* Created at — desktop only */}
                  <div className="hidden lg:flex items-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Actions — desktop only */}
                  <div className="hidden lg:flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none">
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSheet(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>
          {isLoading ? (
            <Skeleton className="h-4 w-40 rounded" />
          ) : (
            <>
              Showing {users.length} user{users.length !== 1 ? "s" : ""}
              {debouncedSearch ? ` for "${debouncedSearch}"` : ""}
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={page === 1 || isLoading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-400 px-1 tabular-nums">
            Page {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={users.length < PAGE_SIZE || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create / Edit Sheet */}
      <UserFormSheet
        mode={sheetMode}
        user={editTarget}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={triggerRefetch}
      />

      {/* Delete Confirmation Overlay */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
          onClick={(e) =>
            e.target === e.currentTarget &&
            !isDeleting &&
            (setDeleteTarget(null), setDeleteError(null))
          }
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-6 ring-1 ring-slate-200/60 dark:ring-white/10">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  Delete User?
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  This will permanently delete{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {deleteTarget.name}
                  </span>
                  . This action cannot be undone.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
                disabled={isDeleting}
                onClick={handleDelete}
                data-testid="confirm-delete-btn"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
