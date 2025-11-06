"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import dayjs from "dayjs"
import { Edit, Trash, Tag } from "lucide-react"
import { Employee } from "@/types/employee"
import { formatCpf } from "@/app/dashboard/colaboradores/utils/employee-utils"
import { Skeleton } from "@/components/ui/skeleton"

interface EmployeeTableProps {
  employees: Employee[]
  loading?: boolean
  onGenerateLabel: (employee: Employee) => void
  onEdit: (employee: Employee) => void
  onDelete: (employeeId: string) => void
}

export function EmployeeTable({ employees, loading = false, onGenerateLabel, onEdit, onDelete }: EmployeeTableProps) {
  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)]">
        <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">CPF</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Nome</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Loja</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Cargo</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Setor</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Data de Início</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Tipo</th>
              <th className="py-2 px-4 border-b whitespace-nowrap text-left font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
          {loading ? (
            // show 6 skeleton rows while loading
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                <td className="py-2 px-4 border-b whitespace-nowrap"><div className="h-4 w-32"><Skeleton className="h-4 w-32" /></div></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-4 w-40" /></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-4 w-20" /></td>
                <td className="py-2 px-4 border-b whitespace-nowrap"><Skeleton className="h-6 w-24" /></td>
              </tr>
            ))
          ) : (
            employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="py-2 px-4 border-b whitespace-nowrap">{formatCpf(emp.cpf)}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{emp.name}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{emp.store}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{emp.position}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{emp.sector}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">
                  {emp.startDate ? dayjs(emp.startDate).format("DD/MM/YYYY") : "-"}
                </td>
                <td className="py-2 px-4 border-b whitespace-nowrap">
                  {emp.isInternal ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Interno
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {emp.role || 'Externo'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 border-b whitespace-nowrap">
                  <TooltipProvider>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="secondary" size="sm" onClick={() => onGenerateLabel(emp)}>
                            <Tag className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gerar Etiqueta ZPL</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => onEdit(emp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar Colaborador</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(emp.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Excluir Colaborador</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  )
}