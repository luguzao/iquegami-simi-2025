import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default function UsersAdminPage() {
  const breadcrumbs = [
    { title: "Início", url: "/dashboard" },
    { title: "Usuários", url: "/dashboard/usuarios" },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 p-6 min-w-0">

          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-muted-foreground">Em breve...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
