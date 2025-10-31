import createServerSupabase from '@/lib/supabase-server'

type Body = {
  name?: string
  description?: string
  location?: string
  startDate?: string
  endDate?: string
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase()
    const body: Body = await req.json()

    if (!body.name) {
      return new Response(JSON.stringify({ error: 'name is required' }), { status: 400 })
    }

    const payload = {
      name: body.name,
      description: body.description || null,
      location: body.location || null,
      start_date: body.startDate ? new Date(body.startDate).toISOString() : null,
      end_date: body.endDate ? new Date(body.endDate).toISOString() : null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('events').insert([payload]).select().single()

    if (error) {
      console.error('events/create error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    return new Response(JSON.stringify({ item: data }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('events/create unexpected', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
