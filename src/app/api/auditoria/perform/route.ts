import createServerSupabase from '@/lib/supabase-server'

type Body = {
  employeeId?: string
  qrContent?: string
  manual?: boolean
  type?: 'checkin' | 'checkout'
  timestamp?: string
  reason?: string
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase()
    const body: Body = await req.json()

  let employeeId = body.employeeId
  // sanitize string 'null' coming from clients
  if (employeeId === 'null') employeeId = undefined

    // If qrContent provided and employeeId not provided, try to find employee by id stored in qr
    if (!employeeId && body.qrContent) {
      // assume qrContent holds the employee id
      // avoid searching for literal 'null'
      const qrContentToSearch = body.qrContent === 'null' ? undefined : body.qrContent
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, name, cpf')
        .eq('id', qrContentToSearch)
        .limit(1)
        .single()

      if (empErr) {
        console.warn('No employee found for qrContent', body.qrContent)
      }
      if (empData) {
        employeeId = empData.id
      }
    }

    if (!employeeId) {
      return new Response(JSON.stringify({ error: 'employeeId not provided and qrContent did not match any employee' }), { status: 400 })
    }

    // Determine action if not provided
    let action = body.type
    if (!action) {
      const { data: last, error: lastErr } = await supabase
        .from('attendance_logs')
        .select('type')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (lastErr) {
        console.error('Error fetching last attendance', lastErr)
      }

      if (last && last.length > 0 && (last as any)[0].type === 'checkin') {
        action = 'checkout'
      } else {
        action = 'checkin'
      }
    }

    const insertPayload = {
      employee_id: employeeId,
      qr_content: body.qrContent || null,
      type: action,
      note: body.reason || null,
      manual: !!body.manual,
      created_at: body.timestamp ? new Date(body.timestamp).toISOString() : new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('Error inserting attendance', error)
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 })
    }

    return new Response(JSON.stringify({ item: data }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('auditoria/perform error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
