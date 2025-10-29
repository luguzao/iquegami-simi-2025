"use client"

import { Button } from "@/components/ui/button"

interface EmployeeActionsProps {
  onAddEmployee: () => void
  onExport: () => void
  onDownloadTemplate: () => void
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDownloadAllLabels: () => void
}

export function EmployeeActions({
  onAddEmployee,
  onExport,
  onDownloadTemplate,
  onImport,
  onDownloadAllLabels
}: EmployeeActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onAddEmployee} className="flex-1 sm:flex-none">
        Cadastrar Colaborador
      </Button>
      <Button onClick={onExport} className="flex-1 sm:flex-none">
        Exportar
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
        Baixar Todas Etiquetas
      </Button>
    </div>
  )
}