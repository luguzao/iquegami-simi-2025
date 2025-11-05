"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import {
  EmployeeActions,
  EmployeeFilters,
  EmployeeTable,
  PaginationControls,
  EmployeeForm,
  ConfirmDialog
} from "@/components/dashboard/colaboradores"
import { useState, useEffect, ChangeEvent } from "react"
import { Employee } from "@/types/employee"
import {
  downloadEmployeeLabel,
  downloadAllEmployeeLabels,
  exportEmployeesToCSV,
  downloadEmployeeTemplate,
  importEmployeesFromCSV,
  importEmployeesFromCSVAsync,
  unformatCpf,
  // optional client helper still available
  fetchEmployeesFromDb,
  formatCpf
} from "./utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy } from "lucide-react"
import { createEmployeeAction, updateEmployeeAction, deleteEmployeeAction, fetchEmployeesAction, bulkCreateEmployeesAction } from "./actions"
import { toast } from "sonner"

export default function DashboardPage() {
  const breadcrumbs = [
    { title: "Início", url: "/dashboard" },
    { title: "Colaboradores", url: "/dashboard/colaboradores" }
  ]

  const [employees, setEmployees] = useState<Employee[]>([])
  // Iniciar como true para mostrar o skeleton imediatamente na primeira render
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar colaboradores do Supabase ao montar
  // useEffect executa no cliente
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        // Use server action to fetch employees (more reliable)
        const data = await fetchEmployeesAction()
        if (mounted) setEmployees(data)
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Erro ao carregar colaboradores')
        toast.error(err?.message || 'Erro ao carregar colaboradores')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({})
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [cpfFilter, setCpfFilter] = useState("")
  const [nameFilter, setNameFilter] = useState("")
  const [storeFilter, setStoreFilter] = useState("")
  const [positionFilter, setPositionFilter] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [appliedFilters, setAppliedFilters] = useState({
    cpf: "",
    name: "",
    store: "",
    position: "",
    sector: "",
    type: ""
  })
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Estados para popups de confirmação
  const [isDownloadAllDialogOpen, setIsDownloadAllDialogOpen] = useState(false)
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null)
  const [duplicateCpfs, setDuplicateCpfs] = useState<string[]>([])
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)

  const filteredEmployees = employees.filter(emp =>
    (appliedFilters.cpf === "" || emp.cpf.includes(appliedFilters.cpf)) &&
    (appliedFilters.name === "" || emp.name.toLowerCase().includes(appliedFilters.name.toLowerCase())) &&
    (appliedFilters.store === "" || (emp.store ? emp.store.toLowerCase().includes(appliedFilters.store.toLowerCase()) : false)) &&
    (appliedFilters.position === "" || (emp.position ? emp.position.toLowerCase().includes(appliedFilters.position.toLowerCase()) : false)) &&
    (appliedFilters.sector === "" || (emp.sector ? emp.sector.toLowerCase().includes(appliedFilters.sector.toLowerCase()) : false)) &&
    (appliedFilters.type === "" || 
     (appliedFilters.type === "interno" && emp.isInternal) || 
     (appliedFilters.type === "externo" && !emp.isInternal) ||
     (appliedFilters.type !== "interno" && appliedFilters.type !== "externo" && 
      (emp.role?.toLowerCase().includes(appliedFilters.type.toLowerCase()) || false)))
  )

  // Calcular colaboradores paginados
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)
    // Accept payload from EmployeeForm so the form's local state isn't ignored
    const handleAddEmployee = async (payload?: Omit<Employee, 'id'>) => {
      // Prefer the payload passed by the form; fall back to local newEmployee state
      const candidate = payload ?? (newEmployee as Omit<Employee, 'id'>)

      const isValidInternal = candidate.isInternal && candidate.cpf && candidate.store && candidate.position && candidate.sector
      const isValidExternal = candidate.isInternal === false && candidate.cpf && candidate.name && candidate.role

      if ((candidate.isInternal !== undefined) && (isValidInternal || isValidExternal)) {
        try {
          if (editingEmployee) {
            // Edit existing in DB (server action)
            const updated = await updateEmployeeAction(editingEmployee.id, {
              ...editingEmployee,
              ...candidate
            } as Partial<Employee>)
            setEmployees(employees.map(emp => emp.id === updated.id ? updated : emp))
            toast.success('Colaborador atualizado com sucesso!')
          } else {
            // Create new in DB
            const toCreate: Omit<Employee, 'id'> = {
              cpf: candidate.cpf!,
              name: candidate.name!,
              store: candidate.store || undefined,
              position: candidate.position || undefined,
              sector: candidate.sector || undefined,
              startDate: candidate.startDate || undefined,
              isInternal: candidate.isInternal!,
              role: candidate.role
            }
            const created = await createEmployeeAction(toCreate)
            setEmployees(prev => [...prev, created])
            toast.success('Colaborador criado com sucesso!')
          }

          setNewEmployee({})
          setEditingEmployee(null)
          setIsDialogOpen(false)
        } catch (err: any) {
          console.error('Erro ao salvar colaborador:', err)
          setError(err?.message || 'Erro ao salvar colaborador')
          // Rethrow so the caller (EmployeeForm) can catch and keep the modal open
          throw err
        }
      }
    }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setNewEmployee({ ...employee })
    setIsDialogOpen(true)
  }

  const handleGenerateLabel = (employee: Employee) => {
    downloadEmployeeLabel(employee)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este colaborador?")) {
      try {
        await deleteEmployeeAction(id)
        setEmployees(prev => prev.filter(emp => emp.id !== id))
        toast.success('Colaborador excluído com sucesso!')
      } catch (err) {
        console.error('Erro ao deletar colaborador:', err)
        setError('Erro ao deletar colaborador')
        toast.error((err as any)?.message || 'Erro ao deletar colaborador')
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (deleteEmployeeId) {
      try {
        await deleteEmployeeAction(deleteEmployeeId)
        setEmployees(prev => prev.filter(emp => emp.id !== deleteEmployeeId))
        toast.success('Colaborador excluído com sucesso!')
      } catch (err) {
        console.error('Erro ao confirmar exclusão:', err)
        setError('Erro ao excluir colaborador')
        toast.error((err as any)?.message || 'Erro ao excluir colaborador')
      } finally {
        setDeleteEmployeeId(null)
      }
    }
  }

  const handleDownloadAllLabelsClick = () => {
    setIsDownloadAllDialogOpen(true)
  }

  const handleConfirmDownloadAll = async () => {
    setIsDownloadAllDialogOpen(false)
    await handleDownloadAllLabels()
  }

  const handleApplyFilters = () => {
    setAppliedFilters({
      cpf: cpfFilter,
      name: nameFilter,
      store: storeFilter,
      position: positionFilter,
      sector: sectorFilter,
      type: typeFilter
    })
    setCurrentPage(1) // Reset para primeira página quando aplicar filtros
  }

  const handleClearFilters = () => {
    setCpfFilter("")
    setNameFilter("")
    setStoreFilter("")
    setPositionFilter("")
    setSectorFilter("")
    setTypeFilter("")
    setAppliedFilters({
      cpf: "",
      name: "",
      store: "",
      position: "",
      sector: "",
      type: ""
    })
    setCurrentPage(1) // Reset para primeira página quando remover filtros
  }

  const handleExport = () => {
    exportEmployeesToCSV(employees)
  }

  const handleDownloadTemplate = () => {
    downloadEmployeeTemplate()
  }

  const handleDownloadAllLabels = async () => {
    await downloadAllEmployeeLabels(employees)
  }

  // Funções de paginação
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1) // Reset para primeira página quando mudar itens por página
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

  // Use toast.promise to show pending -> success/error
  const importPromise = (async () => {
        // Parse CSV into employee payloads
        const parsed = await importEmployeesFromCSVAsync(file)

        if (parsed.length === 0) {
          throw new Error('Nenhum registro válido encontrado no arquivo')
        }

        // Fetch existing employees to check duplicate CPF
        const existing = await fetchEmployeesAction()
        const existingCpfs = new Set(existing.map(e => unformatCpf(e.cpf)))

        // Check duplicates within file
        const freq: Record<string, number> = {}
        for (const p of parsed) {
          const c = unformatCpf(p.cpf)
          freq[c] = (freq[c] || 0) + 1
        }
        const duplicatesInFile = Object.keys(freq).filter(k => freq[k] > 1)

        // Check duplicates against DB
        const duplicatesInDb = parsed.map(p => unformatCpf(p.cpf)).filter(c => existingCpfs.has(c))

        // Combine duplicates (in-file and in-db) and skip them during import
        const skippedSet = new Set<string>()
        duplicatesInFile.forEach(d => skippedSet.add(d))
        duplicatesInDb.forEach(d => skippedSet.add(d))

        const toImport = parsed.filter(p => !skippedSet.has(unformatCpf(p.cpf)))

        // Preparar todos os colaboradores para bulk insert
        const toCreate: Omit<Employee, 'id'>[] = toImport.map(emp => ({
          cpf: unformatCpf(emp.cpf),
          name: emp.name,
          store: emp.store,
          position: emp.position,
          sector: emp.sector,
          startDate: emp.startDate,
          isInternal: emp.isInternal,
          role: emp.role
        }))

        // Bulk insert - uma única chamada ao banco de dados
        const created = await bulkCreateEmployeesAction(toCreate)

        // Update local state with created records
        setEmployees(prev => [...prev, ...created])
        return { createdCount: created.length, skipped: Array.from(skippedSet) }
    })()

    let toastId: any = undefined
    try {
      toastId = toast.loading('Importando dados...')
      const res = await importPromise
      // res is { createdCount, skipped }
      toast.success(`Importação concluída: ${res.createdCount} colaboradores criados.`, { id: toastId })

      if (res.skipped && res.skipped.length > 0) {
        setDuplicateCpfs(res.skipped)
        setIsDuplicateDialogOpen(true)
        // show a separate short toast informing about skipped items
        toast(`Foram pulados ${res.skipped.length} CPFs duplicados. Verifique o relatório.`, {
          duration: 6000,
          action: {
            label: 'Ver duplicados',
            // Re-open the duplicates dialog when clicked
            onClick: () => setIsDuplicateDialogOpen(true)
          }
        })
      }
    } catch (err: any) {
      console.error('Import error', err)
      // update the loading toast with the error if possible
      if (typeof toastId !== 'undefined') {
        try { toast.error(String(err?.message || err), { id: toastId }) } catch (e) { toast.error(String(err?.message || err)) }
      } else {
        toast.error(String(err?.message || err))
      }
    } finally {
      // Reset the input to allow re-uploading the same file
      event.target.value = ""
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader breadcrumbs={breadcrumbs} />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 p-4 min-w-0">
          <EmployeeActions
            onAddEmployee={() => setIsDialogOpen(true)}
            onExport={handleExport}
            onDownloadTemplate={handleDownloadTemplate}
            onImport={handleImport}
            onDownloadAllLabels={handleDownloadAllLabelsClick}
          />
          
          <EmployeeFilters
            cpfFilter={cpfFilter}
            onCpfFilterChange={setCpfFilter}
            nameFilter={nameFilter}
            onNameFilterChange={setNameFilter}
            storeFilter={storeFilter}
            onStoreFilterChange={setStoreFilter}
            positionFilter={positionFilter}
            onPositionFilterChange={setPositionFilter}
            sectorFilter={sectorFilter}
            onSectorFilterChange={setSectorFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
          
          <EmployeeTable
            employees={paginatedEmployees}
            loading={loading}
            onGenerateLabel={handleGenerateLabel}
            onEdit={handleEdit}
            onDelete={setDeleteEmployeeId}
          />
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredEmployees.length}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />

          <EmployeeForm
            isOpen={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setNewEmployee({})
                setEditingEmployee(null)
              }
            }}
            employee={editingEmployee}
            onSave={handleAddEmployee}
          />

          <ConfirmDialog
            isOpen={isDownloadAllDialogOpen}
            onOpenChange={setIsDownloadAllDialogOpen}
            title="Confirmar Download"
            description={`Você está prestes a baixar etiquetas ZPL para todos os ${employees.length} colaboradores do sistema. Este arquivo ZIP pode ser grande dependendo da quantidade de colaboradores. Deseja continuar?`}
            confirmText="Baixar Todas as Etiquetas"
            onConfirm={handleConfirmDownloadAll}
          />

          <ConfirmDialog
            isOpen={!!deleteEmployeeId}
            onOpenChange={(open) => !open && setDeleteEmployeeId(null)}
            title="Confirmar Exclusão"
            description="Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita."
            confirmText="Excluir Colaborador"
            cancelText="Cancelar"
            onConfirm={handleConfirmDelete}
            variant="destructive"
          />

          <ConfirmDialog
            isOpen={isDuplicateDialogOpen}
            onOpenChange={setIsDuplicateDialogOpen}
            title="CPFs duplicados"
            description={
              <div>
                <div className="flex justify-end mb-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon-sm" variant="ghost" onClick={() => {
                          try {
                            const text = duplicateCpfs.map(c => formatCpf(c)).join('\n')
                            navigator.clipboard.writeText(text)
                            toast.success('CPFs copiados para a área de transferência')
                          } catch (e) {
                            toast.error('Falha ao copiar')
                          }
                        }} aria-label="copiar">
                          <Copy className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="max-h-64 overflow-auto">
                  <ul className="list-disc pl-5 space-y-1">
                    {duplicateCpfs.map(c => (
                      <li key={c} className="text-sm">{formatCpf(c)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            }
            confirmText=""
            // Do not clear the list on close so the user can re-open the dialog from the toast
            onConfirm={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
