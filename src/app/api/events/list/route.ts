import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()

    const url = new URL(req.url)
    const search = url.searchParams.get('q') || undefined

    let query = supabase.from('events').select('*')
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query.order('start_date', { ascending: false })

    if (error) {
      console.error('events/list error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    return new Response(JSON.stringify({ items: data || [] }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('events/list unexpected', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
