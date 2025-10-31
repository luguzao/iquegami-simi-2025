import createServerSupabase from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId') || undefined

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'eventId required' }), { status: 400 })
    }

    // Fetch registrations (with employee info)
    // Include employee profile fields so we can show cargo/loja/setor/role
    const { data: regs, error: regsErr } = await supabase
      .from('event_registrations')
      .select('employee_id, registered_at, status, employees(id, name, cpf, position, store, sector, role, isInternal)')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    if (regsErr) {
      console.error('events/attendance registrations error', regsErr)
      return new Response(JSON.stringify({ error: regsErr.message || String(regsErr) }), { status: 500 })
    }

      // Fetch any existing attendance rows for this event
      const { data: atts, error: attsErr } = await supabase
        .from('event_attendance')
        .select('employee_id, checkin_at, checkout_at, note, manual')
        .eq('event_id', eventId)

      if (attsErr) {
        console.error('events/attendance fetch attendance error', attsErr)
      }

      // Fetch all employees to ensure everyone is included and to avoid missing/unregistered persons
      const { data: allEmps, error: empErr } = await supabase.from('employees').select('id, name, cpf, position, store, sector, role, isInternal')
      if (empErr) {
        console.error('events/attendance fetch employees error', empErr)
      }

      // Build maps
      const attMap = new Map<string, any>()
      ;(atts || []).forEach((a: any) => { attMap.set(String(a.employee_id), a) })

      const regsMap = new Map<string, any>()
      ;(regs || []).forEach((r: any) => { regsMap.set(String(r.employee_id), r) })

      const empMap = new Map<string, any>()
      ;(allEmps || []).forEach((e: any) => { empMap.set(String(e.id), e) })

      // Build unified list: iterate over employees so we never miss someone
      const itemsUnsorted: any[] = []
      ;(allEmps || []).forEach((emp: any) => {
        const id = String(emp.id)
        const reg = regsMap.get(id) || null
        const ea = attMap.get(id) || null
        // If registration contains nested employees, normalize
        let regEmp = null
        if (reg && reg.employees) {
          regEmp = Array.isArray(reg.employees) ? reg.employees[0] : reg.employees
        }
        const finalEmp = regEmp || emp
        itemsUnsorted.push({
          employee_id: id,
          employee_name: finalEmp?.name || 'N/A',
          cpf: finalEmp?.cpf || 'N/A',
          position: finalEmp?.position || 'N/A',
          store: finalEmp?.store || 'N/A',
          sector: finalEmp?.sector || 'N/A',
          role: finalEmp?.role || 'N/A',
          isInternal: finalEmp?.isInternal === true,
          registered_at: reg?.registered_at || null,
          registration_status: reg?.status || null,
          checkin_at: ea?.checkin_at || null,
          checkout_at: ea?.checkout_at || null,
          manual: ea?.manual || false,
          note: ea?.note || null,
        })
      })

      // Also include any registrations for employees not present in employees table (external ad-hoc)
      ;(regs || []).forEach((r: any) => {
        const id = String(r.employee_id)
        if (!empMap.has(id)) {
          const regEmp = r.employees ? (Array.isArray(r.employees) ? r.employees[0] : r.employees) : null
          const ea = attMap.get(id) || null
          itemsUnsorted.push({
            employee_id: id,
            employee_name: regEmp?.name || 'N/A',
            cpf: regEmp?.cpf || 'N/A',
            position: regEmp?.position || 'N/A',
            store: regEmp?.store || 'N/A',
            sector: regEmp?.sector || 'N/A',
            role: regEmp?.role || 'N/A',
            isInternal: regEmp?.isInternal === true,
            registered_at: r.registered_at || null,
            registration_status: r.status || null,
            checkin_at: ea?.checkin_at || null,
            checkout_at: ea?.checkout_at || null,
            manual: ea?.manual || false,
            note: ea?.note || null,
          })
        }
      })

      // Sort by employee_name (fallback to id) for consistent ordering
      const items = itemsUnsorted.sort((a: any, b: any) => {
        const an = a.employee_name || a.employee_id
        const bn = b.employee_name || b.employee_id
        return String(an).localeCompare(String(bn))
      })

    return new Response(JSON.stringify({ items }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('events/attendance unexpected', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
