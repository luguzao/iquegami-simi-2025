import createServerSupabase from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase()

    // Buscar todos os employee_ids únicos dos logs
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('employee_id')
      .not('employee_id', 'is', null)

    if (logsError) {
      console.error('Error fetching logs:', logsError)
      return new Response(JSON.stringify({ error: logsError.message }), { status: 500 })
    }

    const employeeIds = Array.from(new Set((logs || []).map(l => l.employee_id)))

    // Buscar quais desses IDs existem na tabela employees
    const { data: existingEmployees, error: empError } = await supabase
      .from('employees')
      .select('id')
      .in('id', employeeIds)

    if (empError) {
      console.error('Error fetching employees:', empError)
      return new Response(JSON.stringify({ error: empError.message }), { status: 500 })
    }

    const existingIds = new Set((existingEmployees || []).map(e => e.id))
    const orphanIds = employeeIds.filter(id => !existingIds.has(id))

    if (orphanIds.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nenhum registro órfão encontrado',
        deleted: 0 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Deletar registros órfãos
    const { error: deleteError } = await supabase
      .from('attendance_logs')
      .delete()
      .in('employee_id', orphanIds)

    if (deleteError) {
      console.error('Error deleting orphan logs:', deleteError)
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ 
      message: `${orphanIds.length} registro(s) órfão(s) removido(s) com sucesso`,
      deleted: orphanIds.length 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('clean-orphans error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
