"use client";

import {
  LayoutDashboard,
  Users,
  HardDrive,
  Ticket,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  ChevronUp,

  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const mainNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & analytics",
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
    badge: "12",
    description: "Support requests",
  },
];

const managementNav = [
  {
    title: "Users",
    href: "/users",
    icon: Users,
    roles: ["admin"],
    description: "User management",
  },
  {
    title: "Assets",
    href: "/assets",
    icon: HardDrive,
    roles: ["admin", "it_staff"],
    description: "IT inventory",
  },
];

const systemNav = [
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "it_staff"],
    description: "Analytics & reports",
  },
  {
    title: "Monitoring",
    href: "/monitoring",
    icon: Activity,
    roles: ["admin", "it_staff"],
    description: "System health",
  },
];

// Mock user — will be replaced with real auth
const mockUser = {
  name: "Admin User",
  email: "admin@example.com",
  role: "admin" as const,
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => pathname === href;

  const visibleManagementNav = managementNav.filter(
    (item) => !item.roles || item.roles.includes(mockUser.role)
  );
  const visibleSystemNav = systemNav.filter(
    (item) => !item.roles || item.roles.includes(mockUser.role)
  );

  const handleLogout = () => {
    document.cookie = "mock_token=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* ── Branding Header ── */}
      <SidebarHeader className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={
              <Link href="/dashboard" className="group/brand flex items-center gap-2">
                <div className="sidebar-brand-icon flex aspect-square size-10 overflow-hidden rounded-md items-center justify-center transition-all duration-300 group-hover/brand:scale-105 shrink-0 shadow-sm border border-slate-200 dark:border-slate-800 bg-white">
                  <Image src="/codev.svg" alt="CoDev" width={32} height={32} className="h-[75%] w-[75%] object-contain" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-[15px] font-bold tracking-tight">
                    CoDev Internal
                  </span>
                  <span className="truncate text-xs font-semibold text-primary">
                    IT Management
                  </span>
                </div>
              </Link>
            } />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-3 my-2 opacity-50" />

      <SidebarContent>
        {/* ── Overview Section ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-1">
              {mainNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <item.icon
                            className={
                              active
                                ? "text-primary size-[18px]"
                                : "size-[18px] transition-colors duration-200"
                            }
                          />
                          <span>{item.title}</span>
                          {"badge" in item && item.badge && (
                            <Badge className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold bg-primary/15 text-primary border-0 shadow-none">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      }
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "sidebar-item-active bg-primary/8 text-primary font-semibold relative before:absolute before:left-1 before:my-auto before:inset-y-0 before:h-4 before:w-[3px] before:rounded-full before:bg-primary before:shadow-sm before:shadow-primary/40"
                          : "sidebar-item text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200"
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Management Section ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-1">
              {visibleManagementNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <item.icon
                            className={
                              active
                                ? "text-primary size-[18px]"
                                : "size-[18px] transition-colors duration-200"
                            }
                          />
                          <span>{item.title}</span>
                        </Link>
                      }
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "sidebar-item-active bg-primary/8 text-primary font-semibold relative before:absolute before:left-1 before:my-auto before:inset-y-0 before:h-4 before:w-[3px] before:rounded-full before:bg-primary before:shadow-sm before:shadow-primary/40"
                          : "sidebar-item text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200"
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── System Section ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-1">
              {visibleSystemNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <item.icon
                            className={
                              active
                                ? "text-primary size-[18px]"
                                : "size-[18px] transition-colors duration-200"
                            }
                          />
                          <span>{item.title}</span>
                        </Link>
                      }
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "sidebar-item-active bg-primary/8 text-primary font-semibold relative before:absolute before:left-1 before:my-auto before:inset-y-0 before:h-4 before:w-[3px] before:rounded-full before:bg-primary before:shadow-sm before:shadow-primary/40"
                          : "sidebar-item text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200"
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Quick Actions Card ── */}
        <div className="mt-auto px-3 pb-2 group-data-[collapsible=icon]:hidden">
          <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="size-3.5 text-primary/70" />
              <span className="text-[11px] font-semibold text-primary/80">
                Pro Tip
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Press{" "}
              <kbd className="inline-flex items-center rounded border border-border/60 bg-muted/60 px-1 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                Ctrl+B
              </kbd>{" "}
              to toggle the sidebar
            </p>
          </div>
        </div>
      </SidebarContent>

      {/* ── User Footer ── */}
      <SidebarSeparator className="mx-3 opacity-50" />
      <SidebarFooter className="pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="group/user data-[state=open]:bg-accent/80 hover:bg-accent/60 transition-all duration-200"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-bold">
                          {mockUser.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online status indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-emerald-500 shadow-sm shadow-emerald-500/40" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-foreground">
                        {mockUser.name}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground/70">
                        {mockUser.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]/user:rotate-180" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-lg border-border/50"
                side="top"
                align="start"
                sideOffset={8}
              >
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-bold">
                      {mockUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="font-semibold text-sm">
                      {mockUser.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mockUser.email}
                    </span>
                    <Badge
                      variant="outline"
                      className="w-fit mt-1 text-[10px] px-1.5 py-0 font-medium border-primary/20 text-primary/80 bg-primary/5"
                    >
                      {mockUser.role}
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem className="gap-2 px-3 py-2 cursor-pointer rounded-lg mx-1 my-0.5">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  className="gap-2 px-3 py-2 cursor-pointer text-destructive focus:text-destructive rounded-lg mx-1 my-0.5"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
