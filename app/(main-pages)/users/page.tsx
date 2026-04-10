"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  Wrench,
  User as UserIcon,
  Mail,
  Calendar,
  UserCheck,
  UserX,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "it_staff" | "end_user";
  status: "active" | "inactive";
  department: string;
  lastLogin: string;
  createdAt: string;
  ticketCount: number;
  assetCount: number;
}

const mockUsers: User[] = [
  { id: "U-001", name: "Admin User", email: "admin@example.com", role: "admin", status: "active", department: "IT", lastLogin: "5m ago", createdAt: "Jan 15, 2024", ticketCount: 0, assetCount: 2 },
  { id: "U-002", name: "Mike Chen", email: "mike.chen@company.com", role: "it_staff", status: "active", department: "IT Support", lastLogin: "1h ago", createdAt: "Feb 3, 2024", ticketCount: 24, assetCount: 3 },
  { id: "U-003", name: "Alex Kim", email: "alex.kim@company.com", role: "it_staff", status: "active", department: "IT Support", lastLogin: "30m ago", createdAt: "Feb 10, 2024", ticketCount: 18, assetCount: 2 },
  { id: "U-004", name: "Jess Park", email: "jess.park@company.com", role: "it_staff", status: "active", department: "IT Infrastructure", lastLogin: "2h ago", createdAt: "Mar 5, 2024", ticketCount: 31, assetCount: 4 },
  { id: "U-005", name: "Sarah Wilson", email: "sarah.wilson@company.com", role: "end_user", status: "active", department: "Marketing", lastLogin: "3h ago", createdAt: "Apr 12, 2024", ticketCount: 5, assetCount: 2 },
  { id: "U-006", name: "John Smith", email: "j.smith@company.com", role: "end_user", status: "active", department: "Sales", lastLogin: "1d ago", createdAt: "Apr 20, 2024", ticketCount: 3, assetCount: 1 },
  { id: "U-007", name: "Maria Doe", email: "m.doe@company.com", role: "end_user", status: "active", department: "Engineering", lastLogin: "4h ago", createdAt: "May 1, 2024", ticketCount: 7, assetCount: 3 },
  { id: "U-008", name: "Sam Taylor", email: "s.taylor@company.com", role: "end_user", status: "inactive", department: "Design", lastLogin: "30d ago", createdAt: "May 15, 2024", ticketCount: 2, assetCount: 0 },
  { id: "U-009", name: "Chris Johnson", email: "c.johnson@company.com", role: "end_user", status: "active", department: "HR", lastLogin: "6h ago", createdAt: "Jun 3, 2024", ticketCount: 1, assetCount: 1 },
  { id: "U-010", name: "Former Employee", email: "former@company.com", role: "end_user", status: "inactive", department: "Finance", lastLogin: "90d ago", createdAt: "Jan 10, 2024", ticketCount: 0, assetCount: 0 },
];

const roleConfig = {
  admin: { label: "Admin", icon: Shield, className: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20" },
  it_staff: { label: "IT Staff", icon: Wrench, className: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  end_user: { label: "End User", icon: UserIcon, className: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20" },
};

export default function UsersPage() {
  const [search, setSearch] = useState("");

  const filtered = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Total Users", value: mockUsers.length, icon: UserIcon },
    { label: "Active", value: mockUsers.filter((u) => u.status === "active").length, icon: UserCheck },
    { label: "Inactive", value: mockUsers.filter((u) => u.status === "inactive").length, icon: UserX },
    { label: "Admins", value: mockUsers.filter((u) => u.role === "admin").length, icon: Shield },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage user accounts and permissions</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl h-10 px-4">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search users by name, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1fr_180px_100px_100px_120px_100px_50px] gap-4 px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>User</span>
          <span>Department</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last Login</span>
          <span>Assets</span>
          <span></span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {filtered.map((user) => {
            const role = roleConfig[user.role];
            const RoleIcon = role.icon;
            return (
              <div
                key={user.id}
                className="grid grid-cols-1 lg:grid-cols-[1fr_180px_100px_100px_120px_100px_50px] gap-2 lg:gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{user.department}</span>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${role.className}`}>
                    <RoleIcon className="h-3 w-3" />
                    {role.label}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                    user.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      user.status === "active" ? "bg-emerald-500 shadow-sm shadow-emerald-500/40" : "bg-slate-300 dark:bg-slate-600"
                    }`} />
                    {user.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {user.lastLogin}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{user.assetCount}</span>
                </div>
                <div className="flex items-center justify-end">
                  <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>Showing {filtered.length} of {mockUsers.length} users</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" disabled>Previous</Button>
          <Button variant="outline" size="sm" className="rounded-lg">Next</Button>
        </div>
      </div>
    </div>
  );
}
