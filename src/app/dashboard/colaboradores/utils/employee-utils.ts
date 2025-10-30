import dayjs from "dayjs"
import JSZip from "jszip"
import { Employee } from "@/types/employee"
import { supabase } from "@/lib/supabase"

/**
 * Função auxiliar para normalizar datas de diferentes formatos
 */
export const normalizeDate = (dateStr: string): string | undefined => {
  if (!dateStr || dateStr.trim() === '') return undefined

  const trimmed = dateStr.trim()

  // Verifica se é formato ISO (2023-01-15)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Valida se a data é válida
    const date = new Date(trimmed + 'T00:00:00')
    if (!isNaN(date.getTime())) {
      return trimmed
    }
  }

  // Verifica se é formato brasileiro (15/01/2025 ou 15/01/2023)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/').map(part => part.padStart(2, '0'))
    const isoDate = `${year}-${month}-${day}`

    // Valida se a data é válida
    const date = new Date(isoDate + 'T00:00:00')
    if (!isNaN(date.getTime())) {
      return isoDate
    }
  }

  // Se não conseguir identificar o formato ou a data for inválida, retorna undefined
  return undefined
}

/**
 * Gera código ZPL para uma etiqueta de funcionário
 */
export const generateEmployeeLabel = (employee: Employee): string => {
  // Keep original structure (internal vs external) but adjust for 100mm x 60mm label
  const dpi = 203
  const mmToDots = (mm: number) => Math.round((dpi / 25.4) * mm)
  const widthDots = mmToDots(100) // ~799
  const heightDots = mmToDots(60) // ~480

  const employeeData = employee.id

  // QR and column positioning (shared for both internal/external layouts)
  const qrColumnStart = widthDots - mmToDots(36) // QR column approx
  const qrXPos = Math.max((qrColumnStart - 40), 420)
  // keep text closer to the left edge
  const marginLeft = 20
  const leftColumnX = marginLeft

  // Reusable helper to break long names into multiple lines
  const breakTextIntoLines = (text: string, maxLength: number = 35): string[] => {
    if (!text) return []
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines
  }

  let zpl: string

  if (employee.isInternal) {
    // Etiqueta para colaboradores internos (mantendo estrutura original)
    const nameLines = breakTextIntoLines(employee.name, 35)
    const nameHeight = nameLines.length * 40 // 40 pontos por linha (como antes)

    // estimate other fields count to compute vertical centering
    const otherFields = [employee.cpf, employee.store, employee.position, employee.sector].filter(f => !!f).length + 1 // +1 for date
    const otherFieldsHeight = otherFields * 40
    const totalContentHeight = nameHeight + 10 + otherFieldsHeight
    const topOffset = Math.max(8, Math.round((heightDots - totalContentHeight) / 2))

    // Gerar ZPL para as linhas do nome (vertically centered)
    const nameZpl = nameLines.map((line, index) =>
      `^FO${leftColumnX},${topOffset + index * 40}^A0N,30,30^FD${index === 0 ? 'Nome: ' : ''}${line}^FS`
    ).join('\n')

    const baseY = topOffset + nameHeight + 10 // Espaço menor após o nome

    const qrSizeMm = 36
    const qrY = Math.round((heightDots - mmToDots(qrSizeMm)) / 2)
    zpl = `^XA\n^CI28\n^PW${widthDots}\n^LL${heightDots}\n${nameZpl}\n^FO${leftColumnX},${baseY}^A0N,30,30^FDCPF: ${employee.cpf}^FS\n^FO${leftColumnX},${baseY + 40}^A0N,30,30^FDLoja: ${employee.store}^FS\n^FO${leftColumnX},${baseY + 80}^A0N,30,30^FDCargo: ${employee.position}^FS\n^FO${leftColumnX},${baseY + 120}^A0N,30,30^FDSetor: ${employee.sector}^FS\n^FO${leftColumnX},${baseY + 160}^A0N,30,30^FDData: ${employee.startDate ? dayjs(employee.startDate).format("DD/MM/YYYY") : "N/A"}^FS\n^FO${qrXPos},${qrY}^BQN,2,9,Q,7^FDQA,${employeeData}^FS\n^XZ`
  } else {
    // Etiqueta para colaboradores externos (mantendo estrutura original)
    const nameLines = breakTextIntoLines(employee.name, 35)

    const nameHeight = nameLines.length * 40

    const otherFields = [employee.cpf, employee.role].filter(f => !!f).length + 1 // +1 for date
    const otherFieldsHeight = otherFields * 40
    const totalContentHeight = nameHeight + 10 + otherFieldsHeight
    const topOffset = Math.max(8, Math.round((heightDots - totalContentHeight) / 2))

    const nameZpl = nameLines.map((line, index) =>
      `^FO${leftColumnX},${topOffset + index * 40}^A0N,30,30^FD${line}^FS`
    ).join('\n')

    const baseY = topOffset + nameHeight + 20

    const qrSizeMm = 36
    const qrY = Math.round((heightDots - mmToDots(qrSizeMm)) / 2)
    zpl = `^XA\n^CI28\n^PW${widthDots}\n^LL${heightDots}\n${nameZpl}\n^FO${leftColumnX},${baseY}^A0N,30,30^FDCPF: ${employee.cpf}^FS\n^FO${leftColumnX},${baseY + 60}^A0N,50,50^FD${employee.role || 'EXTERNO'}^FS\n^FO${qrXPos},${qrY}^BQN,2,9,Q,7^FDQA,${employeeData}^FS\n^XZ`
  }

  return zpl
}

/**
 * Baixa uma etiqueta ZPL para um funcionário específico
 */
export const downloadEmployeeLabel = (employee: Employee): void => {
  const zpl = generateEmployeeLabel(employee)
  const blob = new Blob([zpl], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `etiqueta_${employee.name.replace(/\s+/g, "_")}.zpl`
  a.click()
}

/**
 * Baixa todas as etiquetas ZPL em um arquivo ZIP
 */
export const downloadAllEmployeeLabels = async (employees: Employee[]): Promise<void> => {
  const zip = new JSZip()

  employees.forEach(employee => {
    const zpl = generateEmployeeLabel(employee)
    const fileName = `etiqueta_${employee.name.replace(/\s+/g, "_")}.zpl`
    zip.file(fileName, zpl)
  })

  const zipBlob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = "todas_etiquetas.zip"
  a.click()
}

/**
 * Exporta funcionários para CSV
 */
export const exportEmployeesToCSV = (employees: Employee[]): void => {
  const csv = [
    ["CPF", "Nome", "Loja", "Cargo", "Setor", "Data de Início", "Interno", "Função"],
    ...employees.map(emp => [emp.cpf, emp.name, emp.store, emp.position, emp.sector, emp.startDate || "", emp.isInternal.toString(), emp.role || ""])
  ].map(row => row.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "colaboradores.csv"
  a.click()
}

/**
 * Baixa template CSV para importação
 */
export const downloadEmployeeTemplate = (): void => {
  const csv = [
    ["CPF", "Nome", "Loja", "Cargo", "Setor", "Data de Início", "Interno", "Função"],
    ["123.456.789-00", "João Silva", "Loja A", "Vendedor", "Vendas", "2023-01-15", "true", ""],
    ["987.654.321-00", "Maria Santos", "Loja B", "", "", "15/01/2023", "false", "STAFF"]
  ].map(row => row.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "modelo_colaboradores.csv"
  a.click()
}

/**
 * Importa funcionários de um arquivo CSV
 */
export const importEmployeesFromCSV = (file: File, onSuccess: (employees: Employee[]) => void): void => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const lines = text.split("\n").filter(line => line.trim() !== "")
    const newEmployees: Employee[] = lines.slice(1).map(line => {
      // Split by comma and ensure we have exactly 8 fields (pad with empty strings if needed)
      const parts = line.split(",")
      while (parts.length < 8) {
        parts.push("")
      }

      const cpf = parts[0]?.trim() || ""
      const name = parts[1]?.trim() || ""
  const store = parts[2]?.trim() || undefined
  const position = parts[3]?.trim() || undefined
  const sector = parts[4]?.trim() || undefined
  const startDateRaw = parts[5]?.trim() || undefined
      const isInternalStr = parts[6]?.trim() || ""
      const role = parts[7]?.trim() || undefined

  // Normalizar a data para formato ISO
  const startDate = startDateRaw ? normalizeDate(startDateRaw) : undefined

      // Only create employee if we have cpf and name
      if (cpf && name) {
        const employee: Employee = {
          id: Date.now().toString() + Math.random(),
          cpf,
          name,
          store: store || undefined,
          position: position || undefined,
          sector: sector || undefined,
          startDate,
          isInternal: isInternalStr.toLowerCase() === "true",
          role: role || undefined
        }
        return employee
      }
      return null
    }).filter((emp): emp is Employee => emp !== null)

    if (newEmployees.length > 0) {
      onSuccess(newEmployees)
    }
  }
  reader.readAsText(file)
}

// -------------------------
// Supabase CRUD helpers
// -------------------------

export const fetchEmployeesFromDb = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar colaboradores:', error)
    throw error
  }

  return data ?? []
}

export const createEmployeeOnDb = async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .insert([employee])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar colaborador:', error)
    throw error
  }

  return data as Employee
}

export const updateEmployeeOnDb = async (id: string, patch: Partial<Employee>): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar colaborador:', error)
    throw error
  }

  return data as Employee
}

export const deleteEmployeeOnDb = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar colaborador:', error)
    throw error
  }
}

/**
 * Formata um CPF para o padrão 000.000.000-00
 */
export const formatCpf = (value?: string): string => {
  if (!value) return ''
  // Remove tudo que não for dígito
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const parts = []
  if (digits.length > 0) parts.push(digits.slice(0, 3))
  if (digits.length >= 4) parts.push(digits.slice(3, 6))
  if (digits.length >= 7) parts.push(digits.slice(6, 9))
  const last = digits.length >= 10 ? digits.slice(9, 11) : digits.slice(9)

  let formatted = ''
  if (parts.length > 0) formatted = parts[0]
  if (parts.length > 1) formatted += '.' + parts[1]
  if (parts.length > 2) formatted += '.' + parts[2]
  if (last) formatted += '-' + last

  return formatted
}

/**
 * Remove máscara do CPF, retornando apenas dígitos
 */
export const unformatCpf = (value?: string): string => {
  if (!value) return ''
  return value.replace(/\D/g, '').slice(0, 11)
}

/**
 * Versão assíncrona do importEmployeesFromCSV que retorna uma Promise
 */
export const importEmployeesFromCSVAsync = (file: File): Promise<Omit<Employee, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split("\n").filter(line => line.trim() !== "")
        const raw = lines.slice(1).map(line => {
          const parts = line.split(",")
          while (parts.length < 8) parts.push("")

          const cpf = unformatCpf(parts[0]?.trim() || "")
          const name = parts[1]?.trim() || ""
          const store = parts[2]?.trim() || undefined
          const position = parts[3]?.trim() || undefined
          const sector = parts[4]?.trim() || undefined
          const startDateRaw = parts[5]?.trim() || undefined
          const isInternalStr = parts[6]?.trim() || ""
          const role = parts[7]?.trim() || undefined

          const startDate = startDateRaw ? normalizeDate(startDateRaw) : undefined

          if (cpf && name) {
            const obj: Omit<Employee, 'id'> = {
              cpf,
              name,
              store: store || undefined,
              position: position || undefined,
              sector: sector || undefined,
              startDate,
              isInternal: isInternalStr.toLowerCase() === "true",
              role: role || undefined
            }
            return obj
          }
          return null
        })

        const newEmployees = raw.filter((e): e is Omit<Employee, 'id'> => e !== null)

        resolve(newEmployees)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (ev) => reject(new Error('Erro ao ler arquivo'))
    reader.readAsText(file)
  })
}