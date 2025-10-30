import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()
    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') || '1')
    const perPage = Number(url.searchParams.get('perPage') || '15')

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Select with exact count. We cannot rely on PostgREST FK joins if the DB
    // doesn't expose a relationship, so fetch logs first and then load
    // employees in a separate query to join on employee_id.
    const { data, error, count } = await supabase
      .from('attendance_logs')
      .select('id,employee_id,qr_content,type,created_at,note,manual', { count: 'exact' })
      // Use PostgREST null-safe filter for NOT NULL
      .not('employee_id', 'is', null)
      .in('type', ['checkin', 'checkout'])
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('auditoria/logs fetch error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    const logs = data ?? []

    // Collect employee ids and fetch their basic info in one query
    const employeeIds = Array.from(new Set(logs.map((l: any) => l.employee_id).filter(Boolean)))
    let employeesMap: Record<string, any> = {}
    if (employeeIds.length > 0) {
      const { data: emps } = await supabase
        .from('employees')
        .select('id,name,cpf')
        .in('id', employeeIds)

      if (emps) {
        employeesMap = emps.reduce((acc: any, e: any) => ({ ...acc, [e.id]: e }), {})
      }
    }

    const items = logs.map((d: any) => ({
      ...d,
      employee_name: employeesMap[d.employee_id]?.name ?? null,
      employee_cpf: employeesMap[d.employee_id]?.cpf ?? null,
    }))

    return new Response(JSON.stringify({ items, total: count ?? 0, page, perPage }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('auditoria/logs error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
