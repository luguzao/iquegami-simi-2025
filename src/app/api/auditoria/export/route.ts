import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()

    // Buscar TODOS os registros de auditoria sem paginação
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id,employee_id,qr_content,type,created_at,note,manual')
      .not('employee_id', 'is', null)
      .in('type', ['checkin', 'checkout'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('auditoria/export fetch error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    const logs = data ?? []

    // Buscar informações dos colaboradores
    const employeeIds = Array.from(new Set(logs.map((l: any) => l.employee_id).filter(Boolean)))
    let employeesMap: Record<string, any> = {}
    if (employeeIds.length > 0) {
      const { data: emps, error: empError } = await supabase
        .from('employees')
        .select('id,name,cpf,store,position,role,isInternal')
        .in('id', employeeIds)

      if (empError) {
        console.error('Error fetching employees:', empError)
      }

      if (emps) {
        employeesMap = emps.reduce((acc: any, e: any) => ({ ...acc, [e.id]: e }), {})
      }
    }

    // Preparar dados para exportação
    const items = logs.map((d: any) => {
      const emp = employeesMap[d.employee_id]
      return {
        ...d,
        employee_name: emp?.name ?? null,
        employee_cpf: emp?.cpf ?? null,
        employee_store: emp?.store ?? null,
        employee_position: emp?.position ?? null,
        employee_role: emp?.role ?? null,
        employee_isInternal: emp?.isInternal ?? null,
      }
    })

    // Gerar CSV
    const csvHeader = 'Data/Hora,Funcionário,CPF,Loja,Cargo,Função,Tipo,Manual,Motivo\n'
    
    const csvRows = items.map((item: any) => {
      // Formatar data sem vírgula para evitar problemas no CSV
      const date = new Date(item.created_at)
      const dateStr = date.toLocaleDateString('pt-BR')
      const timeStr = date.toLocaleTimeString('pt-BR')
      const dateTime = `${dateStr} ${timeStr}`
      
      const name = item.employee_name || '[Colaborador não encontrado]'
      const cpf = formatCpf(item.employee_cpf)
      // Loja: mostra apenas se for interno
      const loja = item.employee_isInternal ? (item.employee_store || '-') : '-'
      // Cargo: mostra o position (cargo real do colaborador)
      const cargo = item.employee_position || '-'
      // Função: mostra o role apenas se NÃO for interno (STAFF, SEGURANÇA, etc)
      const funcao = !item.employee_isInternal ? (item.employee_role || '-') : '-'
      const tipo = item.type === 'checkin' ? 'Check-in' : 'Check-out'
      const manual = item.manual ? 'Sim' : 'Não'
      const note = item.note || '-'
      
      // Escapar valores para CSV (colocar entre aspas se contiver vírgula, quebra de linha ou aspas)
      const escape = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }
      
      return [
        escape(dateTime),
        escape(name),
        escape(cpf),
        escape(loja),
        escape(cargo),
        escape(funcao),
        escape(tipo),
        escape(manual),
        escape(note)
      ].join(',')
    }).join('\n')

    const csv = csvHeader + csvRows

    // Retornar CSV com headers apropriados
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="auditoria-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (err) {
    console.error('auditoria/export error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

function formatCpf(raw?: string | null) {
  if (!raw) return '-'
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length !== 11) return raw
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
