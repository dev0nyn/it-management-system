import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./app-sidebar";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, render: r }: { children?: React.ReactNode; render?: React.ReactNode }) => <li>{r ?? children}</li>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarRail: () => null,
  SidebarSeparator: () => <hr />,
  useSidebar: () => ({ isMobile: false }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ render: r }: { render?: React.ReactNode }) => <div>{r}</div>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/lib/auth/use-session", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/auth/use-session";
const mockUseSession = vi.mocked(useSession);

const adminUser = { id: "1", name: "Admin User", email: "admin@example.com", role: "admin" as const };
const endUser = { id: "2", name: "End User", email: "user@example.com", role: "end_user" as const };

describe("AppSidebar RBAC filtering", () => {
  it("renders Dashboard and Tickets for all roles", () => {
    mockUseSession.mockReturnValue({ user: endUser, loading: false });
    render(<AppSidebar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Tickets")).toBeInTheDocument();
  });

  it("renders admin-only nav items for admin role", () => {
    mockUseSession.mockReturnValue({ user: adminUser, loading: false });
    render(<AppSidebar />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
  });

  it("hides Users, Assets, Reports, Monitoring for end_user role", () => {
    mockUseSession.mockReturnValue({ user: endUser, loading: false });
    render(<AppSidebar />);
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Assets")).not.toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Monitoring")).not.toBeInTheDocument();
  });
});
