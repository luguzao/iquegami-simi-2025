import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default function DashboardPage() {
  const breadcrumbs = [
    { title: "Início", url: "/" },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader breadcrumbs={breadcrumbs} />
      
      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 p-4 min-w-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
          
          {/* Conteúdo adicional para testar scroll */}
          <div className="bg-muted/50 h-96 rounded-xl" />
          <div className="bg-muted/50 h-96 rounded-xl" />
          <div className="bg-muted/50 h-96 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
