"use server"

import createServerSupabase from "@/lib/supabase-server"
import { Employee } from "@/types/employee"

const supabase = createServerSupabase()

export async function createEmployeeAction(payload: Omit<Employee, 'id'>) {
  // Server-side validation: if internal, require store/position/sector/startDate
  if (payload.isInternal) {
    if (!payload.store || !payload.position || !payload.sector || !payload.startDate) {
      throw new Error('Para colaboradores internos, Loja, Cargo, Setor e Data de Início são obrigatórios')
    }
  } else {
    if (!payload.role) {
      throw new Error('Para colaboradores externos, a função (role) é obrigatória')
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('createEmployeeAction error', error)
    // Map common supabase/postgres errors to friendly Portuguese messages
    const msg = (() => {
      try {
        const em = String(error?.message || '')
        const code = String(error?.code || '')
        if (code === '23505' || /duplicate key value violates unique constraint/i.test(em)) {
          if (/employees_cpf_key/i.test(em)) return 'CPF já cadastrado.'
          return 'Já existe um registro duplicado.'
        }
        if (/permission denied/i.test(em)) return 'Permissão negada ao acessar o banco de dados.'
        return em || JSON.stringify(error)
      } catch (e) {
        return JSON.stringify(error)
      }
    })()
    throw new Error(msg)
  }

  return data as Employee
}

export async function updateEmployeeAction(id: string, patch: Partial<Employee>) {
  // Server-side validation (if patch sets isInternal true, ensure required fields present)
  if (patch.isInternal) {
    if (!patch.store || !patch.position || !patch.sector || !patch.startDate) {
      throw new Error('Para colaboradores internos, Loja, Cargo, Setor e Data de Início são obrigatórios')
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateEmployeeAction error', error)
    const em = String(error?.message || '')
    if (String(error?.code || '') === '23505' || /duplicate key value violates unique constraint/i.test(em)) {
      if (/employees_cpf_key/i.test(em)) throw new Error('CPF já cadastrado.')
      throw new Error('Já existe um registro duplicado.')
    }
    throw new Error(em || JSON.stringify(error))
  }

  return data as Employee
}

export async function deleteEmployeeAction(id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteEmployeeAction error', error)
    throw new Error(error?.message || JSON.stringify(error))
  }

  return { success: true }
}

export async function fetchEmployeesAction(): Promise<Employee[]> {
  // Buscar todos os colaboradores paginando para contornar o limite de 1000 do Supabase
  const pageSize = 1000
  let allEmployees: Employee[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('fetchEmployeesAction error', error)
      throw new Error(error?.message || JSON.stringify(error))
    }

    const pageData = (data ?? []) as Employee[]
    allEmployees = allEmployees.concat(pageData)

    // Se retornou menos que o pageSize, não há mais páginas
    hasMore = pageData.length === pageSize
    page++
  }

  return allEmployees
}

export async function bulkCreateEmployeesAction(employees: Omit<Employee, 'id'>[]): Promise<Employee[]> {
  if (employees.length === 0) {
    return []
  }

  // Server-side validation para cada colaborador
  for (const payload of employees) {
    if (payload.isInternal) {
      if (!payload.store || !payload.position || !payload.sector || !payload.startDate) {
        throw new Error(`Colaborador ${payload.name}: Para colaboradores internos, Loja, Cargo, Setor e Data de Início são obrigatórios`)
      }
    } else {
      if (!payload.role) {
        throw new Error(`Colaborador ${payload.name}: Para colaboradores externos, a função (role) é obrigatória`)
      }
    }
  }

  // Upsert - Insere novos ou atualiza existentes (baseado no CPF que é unique)
  const { data, error } = await supabase
    .from('employees')
    .upsert(employees, { 
      onConflict: 'cpf',  // Usar CPF como chave de conflito
      ignoreDuplicates: false  // Atualizar se já existir
    })
    .select()

  if (error) {
    console.error('bulkCreateEmployeesAction error', error)
    const msg = (() => {
      try {
        const em = String(error?.message || '')
        const code = String(error?.code || '')
        if (/permission denied/i.test(em)) return 'Permissão negada ao acessar o banco de dados.'
        return em || JSON.stringify(error)
      } catch (e) {
        return JSON.stringify(error)
      }
    })()
    throw new Error(msg)
  }

  return (data ?? []) as Employee[]
}

// Nova action com estatísticas detalhadas
export async function bulkUpsertEmployeesWithStatsAction(
  employees: Omit<Employee, 'id'>[]
): Promise<{ added: number; updated: number; errors: number; total: number }> {
  if (employees.length === 0) {
    return { added: 0, updated: 0, errors: 0, total: 0 }
  }

  // Server-side validation
  for (const payload of employees) {
    if (payload.isInternal) {
      if (!payload.store || !payload.position || !payload.sector || !payload.startDate) {
        throw new Error(`Colaborador ${payload.name}: Para colaboradores internos, Loja, Cargo, Setor e Data de Início são obrigatórios`)
      }
    } else {
      if (!payload.role) {
        throw new Error(`Colaborador ${payload.name}: Para colaboradores externos, a função (role) é obrigatória`)
      }
    }
  }

  // Buscar CPFs existentes antes do upsert para calcular estatísticas
  const cpfsToCheck = employees.map(e => e.cpf)
  const { data: existingEmployees } = await supabase
    .from('employees')
    .select('cpf')
    .in('cpf', cpfsToCheck)

  const existingCpfsSet = new Set((existingEmployees || []).map((e: any) => e.cpf))

  // Contar quantos serão adicionados vs atualizados
  const willBeUpdated = employees.filter(e => existingCpfsSet.has(e.cpf)).length
  const willBeAdded = employees.length - willBeUpdated

  // Fazer um único upsert de todos os registros
  const { data, error } = await supabase
    .from('employees')
    .upsert(employees, {
      onConflict: 'cpf',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    console.error('Erro no bulk upsert:', error)
    throw new Error(`Erro ao importar colaboradores: ${error.message}`)
  }

  return {
    added: willBeAdded,
    updated: willBeUpdated,
    errors: 0,
    total: employees.length
  }
}

// Nova action para buscar colaboradores com paginação no servidor
export async function fetchEmployeesPaginatedAction(params: {
  page: number
  perPage: number
  filters?: {
    cpf?: string
    name?: string
    store?: string
    position?: string
    sector?: string
    type?: string
  }
}): Promise<{ employees: Employee[], total: number }> {
  const { page, perPage, filters = {} } = params
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Construir query base
  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })

  // Aplicar filtros
  if (filters.cpf) {
    query = query.ilike('cpf', `%${filters.cpf}%`)
  }
  if (filters.name) {
    query = query.ilike('name', `%${filters.name}%`)
  }
  if (filters.store) {
    query = query.ilike('store', `%${filters.store}%`)
  }
  if (filters.position) {
    query = query.ilike('position', `%${filters.position}%`)
  }
  if (filters.sector) {
    query = query.ilike('sector', `%${filters.sector}%`)
  }
  if (filters.type) {
    if (filters.type === 'interno') {
      query = query.eq('isInternal', true)
    } else if (filters.type === 'externo') {
      query = query.eq('isInternal', false)
    } else {
      query = query.ilike('role', `%${filters.type}%`)
    }
  }

  // Ordenar e paginar
  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(from, to)

  if (error) {
    console.error('fetchEmployeesPaginatedAction error', error)
    throw new Error(error?.message || JSON.stringify(error))
  }

  return {
    employees: (data ?? []) as Employee[],
    total: count ?? 0
  }
}

// Action para contar total de colaboradores
export async function countEmployeesAction(): Promise<number> {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('countEmployeesAction error', error)
    throw new Error(error?.message || JSON.stringify(error))
  }

  return count ?? 0
}
