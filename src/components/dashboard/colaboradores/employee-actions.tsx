"use client"

import { Button } from "@/components/ui/button"

interface EmployeeActionsProps {
  onAddEmployee: () => void
  onExport: () => void
  onDownloadTemplate: () => void
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDownloadAllLabels: () => void
  hasActiveFilters?: boolean
}

export function EmployeeActions({
  onAddEmployee,
  onExport,
  onDownloadTemplate,
  onImport,
  onDownloadAllLabels,
  hasActiveFilters = false
}: EmployeeActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onAddEmployee} className="flex-1 sm:flex-none">
        Cadastrar Colaborador
      </Button>
      <Button onClick={onExport} className="flex-1 sm:flex-none">
        {hasActiveFilters ? "Exportar Filtrados" : "Exportar"}
      </Button>
      <Button onClick={onDownloadTemplate} className="flex-1 sm:flex-none">
        Baixar Modelo
      </Button>
      <input
        type="file"
        accept=".csv"
        onChange={onImport}
        style={{ display: "none" }}
        id="import-file"
      />
      <Button asChild className="flex-1 sm:flex-none">
        <label htmlFor="import-file">Importar</label>
      </Button>
      <Button onClick={onDownloadAllLabels} variant="outline" className="flex-1 sm:flex-none">
        {hasActiveFilters ? "Baixar Etiquetas Filtradas" : "Baixar Todas Etiquetas"}
      </Button>
    </div>
  )
}