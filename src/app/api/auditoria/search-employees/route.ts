import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()
    const url = new URL(req.url)
    const q = String(url.searchParams.get('q') || '')
    const exact = url.searchParams.get('exact') === '1'

    if (!q) {
      return new Response(JSON.stringify({ items: [] }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (exact) {
      const { data, error } = await supabase
        .from('employees')
        .select('id,name,cpf,store,position')
        .eq('id', q)
        .limit(1)

      if (error) {
        console.error('search-employees exact error', error)
        return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
      }

      return new Response(JSON.stringify({ items: data ?? [] }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Generic search by name or cpf
    const { data, error } = await supabase
      .from('employees')
      .select('id,name,cpf,store,position')
      .or(`name.ilike.%${q}%,cpf.ilike.%${q}%`)
      .limit(20)

    if (error) {
      console.error('search-employees error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    return new Response(JSON.stringify({ items: data ?? [] }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('search-employees exception', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
