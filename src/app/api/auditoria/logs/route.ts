import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()
    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') || '1')
    const perPage = Number(url.searchParams.get('perPage') || '15')

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Select with exact count
    const { data, error, count } = await supabase
      .from('attendance_logs')
      .select('id,employee_id,qr_content,type,created_at,note,manual', { count: 'exact' })
      .neq('employee_id', null)
      .in('type', ['checkin', 'checkout'])
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('auditoria/logs fetch error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    return new Response(JSON.stringify({ items: data ?? [], total: count ?? 0, page, perPage }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('auditoria/logs error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
