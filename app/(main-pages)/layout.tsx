import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-0 overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
