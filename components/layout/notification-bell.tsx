"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Ticket,
  UserCheck,
  RefreshCw,
  BellOff,
  ArrowRight,
} from "lucide-react";
import { authFetch, getApiBase } from "@/lib/api-client";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getNotifStyle(title: string): {
  icon: React.ReactNode;
  accent: string;
  bg: string;
  iconBg: string;
} {
  if (title.toLowerCase().includes("assigned")) {
    return {
      icon: <UserCheck className="h-3.5 w-3.5" />,
      accent: "border-l-indigo-500",
      bg: "bg-indigo-500/10 dark:bg-indigo-500/10",
      iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    };
  }
  if (title.toLowerCase().includes("new ticket")) {
    return {
      icon: <Ticket className="h-3.5 w-3.5" />,
      accent: "border-l-amber-500",
      bg: "bg-amber-500/10 dark:bg-amber-500/10",
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    };
  }
  // "Ticket updated"
  return {
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    accent: "border-l-emerald-500",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  };
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authFetch(`${getApiBase()}/api/v1/notifications`);
        if (res.ok && !cancelled) {
          const { data } = await res.json();
          setItems(data ?? []);
        }
      } catch {
        // non-critical
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id: string) {
    try {
      await authFetch(`${getApiBase()}/api/v1/notifications/${id}`, { method: "PATCH" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // non-critical
    }
  }

  async function markAllRead() {
    try {
      await authFetch(`${getApiBase()}/api/v1/notifications/read-all`, { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // non-critical
    }
  }

  async function handleNotifClick(n: NotificationItem) {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className={`h-4 w-4 transition-colors ${open ? "text-foreground" : "text-muted-foreground"}`} />
        {unread > 0 && (
          <>
            {/* Pulse ring */}
            <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-red-500 opacity-50 animate-ping" />
            {/* Badge */}
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-11 z-50 w-[calc(100vw-1rem)] sm:w-96 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/5">

          {/* Header */}
          <div className="flex items-center justify-between bg-muted/40 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">All caught up</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No notifications yet</p>
                </div>
              </div>
            ) : (
              items.map((n) => {
                const style = getNotifStyle(n.title);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`group w-full text-left border-l-4 transition-all duration-150 ${style.accent} ${
                      n.read
                        ? "border-l-transparent hover:bg-muted/50"
                        : `${style.bg} hover:brightness-95`
                    }`}
                  >
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      {/* Icon */}
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        n.read ? "bg-muted text-muted-foreground" : style.iconBg
                      }`}>
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                        <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/70">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>

                      {/* Arrow on hover */}
                      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">
                Showing {items.length} most recent · Auto-refreshes every 30s
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
