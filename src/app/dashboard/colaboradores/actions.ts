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
