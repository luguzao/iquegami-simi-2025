"use client"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface EmployeeFiltersProps {
  cpfFilter: string
  nameFilter: string
  storeFilter: string
  positionFilter: string
  sectorFilter: string
  typeFilter: string
  onCpfFilterChange: (value: string) => void
  onNameFilterChange: (value: string) => void
  onStoreFilterChange: (value: string) => void
  onPositionFilterChange: (value: string) => void
  onSectorFilterChange: (value: string) => void
  onTypeFilterChange: (value: string) => void
  onApplyFilters: () => void
  onClearFilters: () => void
}

export function EmployeeFilters({
  cpfFilter,
  nameFilter,
  storeFilter,
  positionFilter,
  sectorFilter,
  typeFilter,
  onCpfFilterChange,
  onNameFilterChange,
  onStoreFilterChange,
  onPositionFilterChange,
  onSectorFilterChange,
  onTypeFilterChange,
  onApplyFilters,
  onClearFilters
}: EmployeeFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="mb-4">
          {isOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Filtros</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <Label htmlFor="cpf-filter">CPF</Label>
            <Input
              id="cpf-filter"
              placeholder="Filtrar por CPF"
              value={cpfFilter}
              onChange={(e) => onCpfFilterChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="name-filter">Nome</Label>
            <Input
              id="name-filter"
              placeholder="Filtrar por nome"
              value={nameFilter}
              onChange={(e) => onNameFilterChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="store-filter">Loja</Label>
            <Input
              id="store-filter"
              placeholder="Filtrar por loja"
              value={storeFilter}
              onChange={(e) => onStoreFilterChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="position-filter">Cargo</Label>
            <Input
              id="position-filter"
              placeholder="Filtrar por cargo"
              value={positionFilter}
              onChange={(e) => onPositionFilterChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sector-filter">Setor</Label>
            <Input
              id="sector-filter"
              placeholder="Filtrar por setor"
              value={sectorFilter}
              onChange={(e) => onSectorFilterChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="type-filter">Tipo</Label>
            <Input
              id="type-filter"
              placeholder="interno/externo ou função"
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onApplyFilters}>Filtrar</Button>
          <Button variant="outline" onClick={onClearFilters}>Remover Filtros</Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}