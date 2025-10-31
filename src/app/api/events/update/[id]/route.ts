import createServerSupabase from '@/lib/supabase-server'

type Body = {
  name?: string
  description?: string
  location?: string
  startDate?: string
  endDate?: string
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabase()
    const { id } = params
    const body: Body = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'event id is required' }), { status: 400 })
    }

    if (!body.name) {
      return new Response(JSON.stringify({ error: 'name is required' }), { status: 400 })
    }

    const payload = {
      name: body.name,
      description: body.description || null,
      location: body.location || null,
      start_date: body.startDate ? new Date(body.startDate).toISOString() : null,
      end_date: body.endDate ? new Date(body.endDate).toISOString() : null,
    }

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('events/update error', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'event not found' }), { status: 404 })
    }

    return new Response(JSON.stringify({ item: data }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('events/update unexpected', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
