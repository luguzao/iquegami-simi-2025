import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()
    const url = new URL(req.url)
    const employeeId = String(url.searchParams.get('employeeId') || '')
    const limit = Number(url.searchParams.get('limit') || '5')

    if (!employeeId) {
      return new Response(JSON.stringify({ items: [] }), { headers: { 'Content-Type': 'application/json' } })
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id,employee_id,qr_content,type,created_at,note,manual')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('last-entries error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    return new Response(JSON.stringify({ items: data ?? [] }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('last-entries exception', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
