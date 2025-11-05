"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Employee } from "@/types/employee"
import { formatCpf, unformatCpf } from "@/app/dashboard/colaboradores/utils/employee-utils"

interface EmployeeFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee | null
  onSave: (employee: Omit<Employee, "id">) => Promise<any>
}

export function EmployeeForm({ isOpen, onOpenChange, employee, onSave }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    cpf: "",
    name: "",
    store: "",
    position: "",
    sector: "",
    startDate: "",
    isInternal: true,
    role: ""
  })

  useEffect(() => {
    if (employee) {
      setFormData({
        cpf: formatCpf(employee.cpf),
        name: employee.name,
        store: employee.store || "",
        position: employee.position || "",
        sector: employee.sector || "",
        startDate: employee.startDate || "",
        isInternal: employee.isInternal,
        role: employee.role || ""
      })
    } else {
      setFormData({
        cpf: "",
        name: "",
        store: "",
        position: "",
        sector: "",
        startDate: "",
        isInternal: true,
        role: ""
      })
    }
  }, [employee, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const employeeData: Omit<Employee, "id"> = {
      cpf: unformatCpf(formData.cpf),
      name: formData.name,
      store: formData.store,
      position: formData.position,
      sector: formData.sector,
      startDate: formData.startDate || undefined,
      isInternal: formData.isInternal,
      role: formData.isInternal ? undefined : formData.role || undefined
    }

    // Await the onSave promise so we can keep the modal open on error
    ;(async () => {
      try {
        await onSave(employeeData)
        onOpenChange(false)
      } catch (err: any) {
        // Keep the modal open and surface an error via toast
        console.error('Erro ao salvar no form:', err)
        toast.error(err?.message || 'Erro ao salvar colaborador')
      }
    })()
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    // Se for string, converter para caixa alta
    if (typeof value === 'string') {
      value = value.toUpperCase()
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCpfChange = (value: string) => {
    // Keep masked value in state for display, but limit to CPF format
    const masked = formatCpf(value)
    setFormData(prev => ({ ...prev, cpf: masked }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleCpfChange((e.target as HTMLInputElement).value)}
              inputMode="numeric"
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="store">Loja</Label>
            <Input
              id="store"
              value={formData.store}
              onChange={(e) => handleInputChange("store", e.target.value)}
              required={formData.isInternal}
            />
          </div>

          <div>
            <Label htmlFor="position">Cargo</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => handleInputChange("position", e.target.value)}
              required={formData.isInternal}
            />
          </div>

          <div>
            <Label htmlFor="sector">Setor</Label>
            <Input
              id="sector"
              value={formData.sector}
              onChange={(e) => handleInputChange("sector", e.target.value)}
              required={formData.isInternal}
            />
          </div>

          <div>
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              max="9999-12-31"
              onChange={(e) => handleInputChange("startDate", e.target.value)}
              required={formData.isInternal}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isInternal"
              checked={formData.isInternal}
              onChange={(e) => handleInputChange("isInternal", (e.target as HTMLInputElement).checked)}
              className="rounded"
            />
            <Label htmlFor="isInternal" className="text-sm">Colaborador Interno</Label>
          </div>

          {!formData.isInternal && (
            <div>
              <Label htmlFor="role">Função/Empresa</Label>
              <Input
                id="role"
                placeholder="Ex: STAFF, Segurança, etc."
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {employee ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}