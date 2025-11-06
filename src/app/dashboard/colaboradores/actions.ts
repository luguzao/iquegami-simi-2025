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
  // Buscar todos os colaboradores sem limite
  // Por padrão, Supabase limita a 1000 registros, então precisamos ajustar
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true })
    .limit(100000) // Aumentar o limite para garantir que pegue todos

  if (error) {
    console.error('fetchEmployeesAction error', error)
    throw new Error(error?.message || JSON.stringify(error))
  }

  return (data ?? []) as Employee[]
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

  // Bulk insert - Supabase insere tudo de uma vez
  const { data, error } = await supabase
    .from('employees')
    .insert(employees)
    .select()

  if (error) {
    console.error('bulkCreateEmployeesAction error', error)
    const msg = (() => {
      try {
        const em = String(error?.message || '')
        const code = String(error?.code || '')
        if (code === '23505' || /duplicate key value violates unique constraint/i.test(em)) {
          if (/employees_cpf_key/i.test(em)) return 'Um ou mais CPFs já estão cadastrados.'
          return 'Já existem registros duplicados.'
        }
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
