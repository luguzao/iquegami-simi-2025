import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
    children
}: {
    children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="bg-sidebar w-full flex items-center justify-center md:p-2 h-full overflow-hidden">
            <div className="rounded-2xl flex flex-col h-full w-full bg-background overflow-hidden max-w-full">
                {children}
            </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
