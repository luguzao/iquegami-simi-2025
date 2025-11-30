import createServerSupabase from '@/lib/supabase-server'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export async function GET(req: Request) {
  try {
    console.log('API ATTENDANCE - Iniciando')
    const supabase = createServerSupabase()
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId') || undefined

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'eventId required' }), { status: 400 })
    }

    console.log(`Processando evento: ${eventId}`)

    // Buscar informações do evento
    const { data: eventData, error: eventErr } = await supabase
      .from('events')
      .select('id, name, start_date, end_date')
      .eq('id', eventId)
      .single()

    if (eventErr) {
      console.log('Erro ao buscar evento:', eventErr)
      return new Response(JSON.stringify({ error: eventErr.message }), { status: 500 })
    }

    console.log('Evento encontrado:', eventData)

    // Verificar se é evento multi-dia
    const isMultiDay = eventData && eventData.start_date && eventData.end_date &&
      dayjs(eventData.end_date).diff(dayjs(eventData.start_date), 'day') > 0

    console.log('isMultiDay:', isMultiDay)

    // Buscar inscrições do evento
    const { data: registrations, error: regsErr } = await supabase
      .from('event_registrations')
      .select('employee_id, registered_at, status, employees(id, name, cpf, position, store, sector, role, isInternal)')
      .eq('event_id', eventId)

    if (regsErr) {
      console.log('Erro ao buscar inscrições:', regsErr)
      return new Response(JSON.stringify({ error: regsErr.message }), { status: 500 })
    }

    console.log(`Encontradas ${registrations?.length || 0} inscrições`)

    // Buscar attendance logs
    const { data: attendanceLogs, error: logsErr } = await supabase
      .from('attendance_logs')
      .select('id, employee_id, created_at, type')
      .gte('created_at', dayjs(eventData.start_date).toISOString())
      .lte('created_at', dayjs(eventData.end_date).toISOString())
      .in('type', ['checkin', 'checkout'])

    if (logsErr) {
      console.log('Erro ao buscar logs:', logsErr)
    }

    console.log(`Encontrados ${attendanceLogs?.length || 0} logs de attendance`)
    console.log('Logs sample:', attendanceLogs?.slice(0, 5).map(l => ({ created_at: l.created_at, type: l.type, employee_id: l.employee_id })))

    // Se é multi-dia, criar registros por dia baseados nos logs de auditoria
    if (isMultiDay) {
      console.log('Processando evento multi-dia baseado nos logs de auditoria')

      const items: any[] = []

      // Buscar TODOS os funcionários (com paginação)
      let allEmployees: any[] = []
      let fromEmp = 0
      const empBatchSize = 1000
      while (true) {
        const { data: batch, error: empErr } = await supabase
          .from('employees')
          .select('id, name, cpf, position, store, sector, role, isInternal')
          .range(fromEmp, fromEmp + empBatchSize - 1)

        if (empErr) {
          console.log('Erro ao buscar lote de funcionários:', empErr)
          break
        }

        if (!batch || batch.length === 0) break

        allEmployees.push(...batch)
        fromEmp += empBatchSize

        if (batch.length < empBatchSize) break
      }

      console.log(`Encontrados ${allEmployees.length} funcionários no total`)

      const employeesMap: Map<string, any> = new Map(allEmployees.map(emp => [emp.id, emp]))

      // Buscar TODOS os logs do período (com paginação)
      let allLogs: any[] = []
      let from = 0
      const batchSize = 1000
      while (true) {
        const { data: batch, error: batchErr } = await supabase
          .from('attendance_logs')
          .select('id, employee_id, created_at, type')
          .gte('created_at', dayjs(eventData.start_date).toISOString())
          .lte('created_at', dayjs(eventData.end_date).add(1, 'day').toISOString())
          .in('type', ['checkin', 'checkout'])
          .range(from, from + batchSize - 1)
          .order('created_at', { ascending: true })

        if (batchErr) {
          console.log('Erro ao buscar lote de logs:', batchErr)
          break
        }

        if (!batch || batch.length === 0) break

        allLogs.push(...batch)
        from += batchSize

        if (batch.length < batchSize) break
      }

      console.log(`Encontrados ${allLogs.length} logs de auditoria (com paginação)`)

      console.log('Primeiros 5 logs de attendance:', allLogs.slice(0, 5).map(log => ({
        employee_id: log.employee_id,
        checkin_time: log.created_at,
        type: log.type
      })))

      const attendanceLogs = allLogs

      // Agrupar logs por employee_id e dia (usando horário local)
      const logsByEmployeeDay: Map<string, { checkins: any[], checkouts: any[] }> = new Map()

      attendanceLogs?.forEach(log => {
        const employeeId = String(log.employee_id)
        const dayStr = dayjs(log.created_at).format('YYYY-MM-DD')
        const key = `${employeeId}-${dayStr}`

        if (!logsByEmployeeDay.has(key)) {
          logsByEmployeeDay.set(key, { checkins: [], checkouts: [] })
        }

        if (log.type === 'checkin') {
          logsByEmployeeDay.get(key)!.checkins.push(log)
        } else if (log.type === 'checkout') {
          logsByEmployeeDay.get(key)!.checkouts.push(log)
        }
      })

      console.log(`Logs agrupados em ${logsByEmployeeDay.size} combinações employee-dia`)

      // Calcular dias do evento
      const eventStart = dayjs(eventData.start_date)
      const eventEnd = dayjs(eventData.end_date)
      const totalDays = eventEnd.diff(eventStart, 'day') + 1
      const eventDays: string[] = []
      for (let i = 0; i < totalDays; i++) {
        eventDays.push(eventStart.add(i, 'day').format('YYYY-MM-DD'))
      }

      console.log(`Evento tem ${totalDays} dias: ${eventDays.join(', ')}`)

      // Para cada funcionário, criar registros para todos os dias do evento
      for (const emp of allEmployees) {
        const employeeId = emp.id
        const employeeInfo = employeesMap.get(employeeId) || {
          name: `Funcionário ${employeeId}`,
          cpf: 'N/A',
          position: 'N/A',
          store: 'N/A',
          sector: 'N/A',
          role: 'N/A',
          isInternal: true
        }

        for (const dayStr of eventDays) {
          const key = `${employeeId}-${dayStr}`
          const dayLogs = logsByEmployeeDay.get(key) || { checkins: [], checkouts: [] }

          // Primeiro check-in do dia
          const checkin = dayLogs.checkins.sort((a: any, b: any) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf())[0]
          // Último check-out do dia
          const checkout = dayLogs.checkouts.sort((a: any, b: any) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())[0]

          items.push({
            employee_id: employeeId,
            employee_name: employeeInfo.name,
            cpf: employeeInfo.cpf,
            position: employeeInfo.position,
            store: employeeInfo.store,
            sector: employeeInfo.sector,
            role: employeeInfo.role,
            isInternal: employeeInfo.isInternal,
            registered_at: null,
            registration_status: null,
            checkin_at: checkin?.created_at || null,
            checkout_at: checkout?.created_at || null,
            manual: false,
            note: null,
            attendance_day: dayStr
          })
        }
      }

      console.log(`Gerados ${items.length} registros de presença`)

      return new Response(JSON.stringify({
        items,
        debug: {
          totalItems: items.length,
          logsCount: allLogs.length,
          employeesCount: allEmployees.length,
          daysCount: totalDays,
          employeeIdsSample: allEmployees.slice(0, 5).map(e => e.id),
          employeesFound: allEmployees.length
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Para eventos de um dia ou sem inscrições, retornar resposta básica
    return new Response(JSON.stringify({
      eventId,
      isMultiDay,
      eventData,
      registrationsCount: registrations?.length || 0,
      logsCount: attendanceLogs?.length || 0,
      message: 'Evento não é multi-dia ou não tem inscrições'
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Erro geral:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
