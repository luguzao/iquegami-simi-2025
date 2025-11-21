import createServerSupabase from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase();

    // Buscar TODOS os registros de auditoria com paginação
    const allLogs: any[] = [];
    const pageSize = 1000;
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("id,employee_id,qr_content,type,created_at,note,manual,event_id")
        .in("type", ["checkin", "checkout"])
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("auditoria/export fetch error", error);
        return new Response(
          JSON.stringify({ error: error.message || String(error) }),
          { status: 500 }
        );
      }

      const logs = data ?? [];
      allLogs.push(...logs);

      hasMore = logs.length === pageSize;
      offset += pageSize;

      // Limite de segurança para evitar loops infinitos
      if (offset > 50000) {
        console.warn("Reached maximum offset limit, stopping pagination");
        break;
      }
    }

    console.log(`Total logs fetched: ${allLogs.length}`);
    const logsWithEventId = allLogs.filter(l => l.event_id);
    console.log(`Logs with event_id: ${logsWithEventId.length}`);

    // Debug: mostrar qr_contents únicos
    const uniqueQrContents = [...new Set(allLogs.map(l => l.qr_content).filter(Boolean))];
    console.log(`Unique QR contents (${uniqueQrContents.length}):`, uniqueQrContents.slice(0, 10));

    const logs = allLogs;

    // Buscar informações dos colaboradores
    const employeeIds = Array.from(
      new Set(logs.map((l: any) => l.employee_id).filter(Boolean))
    ).filter(id => id && typeof id === 'string' && id.length > 0);

    let employeesMap: Record<string, any> = {};
    if (employeeIds.length > 0) {
      // Processar em lotes para evitar problemas com queries muito grandes
      const batchSize = 100;
      for (let i = 0; i < employeeIds.length; i += batchSize) {
        const batch = employeeIds.slice(i, i + batchSize);
        const { data: emps, error: empError } = await supabase
          .from("employees")
          .select("id,name,cpf,store,position,role,isInternal")
          .in("id", batch);

        if (empError) {
          console.error("Error fetching employees batch:", empError);
          continue;
        }

        if (emps) {
          emps.forEach((e: any) => {
            employeesMap[e.id] = e;
          });
        }
      }
    }

    // Buscar informações de eventos (por event_id direto, qr_content, ou timestamp)
    const eventIdsFromLogs = logs
      .map((l: any) => l.event_id)
      .filter(Boolean)
      .filter(id => id && typeof id === 'string' && id.length > 0);

    const qrContents = logs.map((l: any) => l.qr_content).filter(Boolean);
    let eventsMap: Record<string, any> = {};

    // Primeiro, buscar eventos pelos event_id diretos
    if (eventIdsFromLogs.length > 0) {
      const { data: eventsById, error: eventsError } = await supabase
        .from("events")
        .select("id,name,location,start_date,end_date")
        .in("id", eventIdsFromLogs);

      if (!eventsError && eventsById) {
        eventsById.forEach((e: any) => {
          eventsMap[e.id] = e;
        });
      }
    }

    // Segundo, tentar buscar eventos pelos IDs que podem estar no qr_content
    const potentialEventIds = qrContents
      .map((qc: string) => {
        const matches = qc.match(/\d+/g);
        return matches ? matches[0] : null;
      })
      .filter((id: string | null) => id && /^\d+$/.test(id))
      .map((id: string) => id)
      .filter((id) => !eventsMap[id]);

    if (potentialEventIds.length > 0) {
      const { data: eventsByQr, error: eventsQrError } = await supabase
        .from("events")
        .select("id,name,location,start_date,end_date")
        .in("id", potentialEventIds);

      if (!eventsQrError && eventsByQr) {
        eventsByQr.forEach((e: any) => {
          eventsMap[e.id] = e;
        });
      }
    }

    // Terceiro, buscar TODOS os eventos para detecção por timestamp
    const { data: allEvents, error: allEventsError } = await supabase
      .from("events")
      .select("id,name,location,start_date,end_date")
      .order("start_date", { ascending: false });

    console.log(`Found ${allEvents?.length || 0} total events in database`);
    if (allEvents && allEvents.length > 0) {
      console.log("Sample events:", allEvents.slice(0, 3).map(e => ({
        id: e.id,
        name: e.name,
        start: e.start_date,
        end: e.end_date
      })));
    }

    if (!allEventsError && allEvents) {
      // Criar mapa de eventos por timestamp para detecção rápida
      const eventsByTimestamp: any[] = allEvents.map(event => ({
        ...event,
        startTime: event.start_date ? new Date(event.start_date).getTime() : null,
        endTime: event.end_date ? new Date(event.end_date).getTime() : null,
      }));
      
      console.log('Events with timestamps:');
      eventsByTimestamp.forEach(evt => {
        console.log(`Event ${evt.name}: start_date="${evt.start_date}" -> ${evt.startTime}, end_date="${evt.end_date}" -> ${evt.endTime}`);
      });

      // Para cada log sem evento detectado, tentar encontrar por timestamp
      logs.forEach((log: any) => {
        if (eventsMap[log.event_id]) return; // Já tem evento por event_id

        // Verificar se qr_content já indicou um evento
        let hasEventFromQr = false;
        if (log.qr_content) {
          const matches = log.qr_content.match(/\d+/g);
          if (matches && eventsMap[matches[0]]) {
            hasEventFromQr = true;
          }
        }
        if (hasEventFromQr) return;

        // Detectar por timestamp
        const logTime = new Date(log.created_at).getTime();

        // Primeiro: evento ativo no momento (start <= time <= end)
        let matchingEvent = eventsByTimestamp.find(event =>
          event.startTime && event.endTime &&
          event.startTime <= logTime && logTime <= event.endTime
        );

        // Segundo: heurística +/- 2 horas do start_date
        if (!matchingEvent) {
          matchingEvent = eventsByTimestamp.find(event => {
            if (!event.startTime) return false;
            const timeDiff = Math.abs(logTime - event.startTime);
            const twoHours = 2 * 60 * 60 * 1000; // 2 horas em ms
            return timeDiff <= twoHours;
          });
        }

        if (matchingEvent) {
          eventsMap[matchingEvent.id] = matchingEvent;
        }
      });
    }

    console.log(`Total events detected: ${Object.keys(eventsMap).length}`);
    console.log('Events in map:', Object.keys(eventsMap).map(id => `${id}: ${eventsMap[id].name} (${eventsMap[id].startTime} - ${eventsMap[id].endTime})`));

    // Preparar dados para exportação
    const items = logs.map((d: any) => {
      // Tentar encontrar funcionário por employee_id primeiro, depois por qr_content
      let emp = d.employee_id ? employeesMap[d.employee_id] : null;
      if (!emp && d.qr_content) {
        emp = employeesMap[d.qr_content];
      }

      // Tentar encontrar evento por event_id direto primeiro, depois por qr_content, depois por timestamp
      let event = null;
      if (d.event_id) {
        event = eventsMap[d.event_id];
      }
      if (!event && d.qr_content) {
        const matches = d.qr_content.match(/\d+/g);
        if (matches) {
          event = eventsMap[matches[0]]; // Usar o primeiro número como chave
        }
      }
      
      // Se ainda não encontrou evento, tentar detecção por timestamp
      if (!event) {
        const logTime = new Date(d.created_at).getTime();
        console.log(`Checking timestamp for log ${d.id}: ${d.created_at} (${logTime})`);
        
        // Procurar evento que contenha este timestamp
        for (const eventId in eventsMap) {
          const evt = eventsMap[eventId];
          console.log(`Checking event ${evt.name}: start=${evt.startTime}, end=${evt.endTime}, log=${logTime}`);
          if (evt.startTime && evt.endTime && evt.startTime <= logTime && logTime <= evt.endTime) {
            event = evt;
            console.log(`Timestamp match found for log ${d.id}: Event ${evt.name} (${evt.startTime} - ${evt.endTime})`);
            break;
          }
        }
        
        // Se não encontrou no período exato, tentar heurística +/- 2 horas do start_date
        if (!event) {
          for (const eventId in eventsMap) {
            const evt = eventsMap[eventId];
            if (evt.startTime) {
              const timeDiff = Math.abs(logTime - evt.startTime);
              const twoHours = 2 * 60 * 60 * 1000; // 2 horas em ms
              if (timeDiff <= twoHours) {
                event = evt;
                console.log(`Heuristic match found for log ${d.id}: Event ${evt.name} (within 2h of start)`);
                break;
              }
            }
          }
        }
      }

      return {
        ...d,
        employee_name: emp?.name ?? null,
        employee_cpf: emp?.cpf ?? null,
        employee_store: emp?.store ?? null,
        employee_position: emp?.position ?? null,
        employee_role: emp?.role ?? null,
        employee_isInternal: emp?.isInternal ?? null,
        event_name: event?.name ?? null,
        event_location: event?.location ?? null,
      };
    });

    // Gerar CSV
    const csvHeader =
      "Data/Hora,Funcionário,CPF,Loja,Cargo,Função,Evento,Local do Evento,Tipo,Manual,Motivo\n";

    const csvRows = items
      .map((item: any) => {
        // Formatar data sem vírgula para evitar problemas no CSV
        // Usar timezone do Brasil (America/Sao_Paulo)
        const date = new Date(item.created_at);
        const dateStr = date.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });
        const timeStr = date.toLocaleTimeString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });
        const dateTime = `${dateStr} ${timeStr}`;

        const name = item.employee_name || "[Colaborador não encontrado]";
        const cpf = formatCpf(item.employee_cpf);
        // Loja: mostra apenas se for interno
        const loja = item.employee_isInternal
          ? item.employee_store || "-"
          : "-";
        // Cargo: mostra o position (cargo real do colaborador)
        const cargo = item.employee_position || "-";
        // Função: mostra o role apenas se NÃO for interno (STAFF, SEGURANÇA, etc)
        const funcao = !item.employee_isInternal
          ? item.employee_role || "-"
          : "-";
        // Evento: nome do evento se existir
        const evento = item.event_name || "-";
        // Local do evento: localização se existir
        const localEvento = item.event_location || "-";
        const tipo = item.type === "checkin" ? "Check-in" : "Check-out";
        const manual = item.manual ? "Sim" : "Não";
        const note = item.note || "-";

        // Escapar valores para CSV (colocar entre aspas se contiver vírgula, quebra de linha ou aspas)
        const escape = (val: string) => {
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };

        return [
          escape(dateTime),
          escape(name),
          escape(cpf),
          escape(loja),
          escape(cargo),
          escape(funcao),
          escape(evento),
          escape(localEvento),
          escape(tipo),
          escape(manual),
          escape(note),
        ].join(",");
      })
      .join("\n");

    const csv = csvHeader + csvRows;

    // Adicionar BOM para compatibilidade com Excel no Windows
    const csvWithBom = "\ufeff" + csv;

    // Retornar CSV com headers apropriados
    return new Response(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (err) {
    console.error("auditoria/export error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}

function formatCpf(raw?: string | null) {
  if (!raw) return "-";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 11) return raw;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
