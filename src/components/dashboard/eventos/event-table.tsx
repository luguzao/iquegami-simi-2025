"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Event } from '@/types/event'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

type Props = {
  events: Event[]
  onView?: (ev: Event) => void
  onEdit?: (ev: Event) => void
  onReports?: (ev: Event) => void
}

export function EventTable({ events, onView, onEdit, onReports }: Props) {
  const router = useRouter()

  if (!events || events.length === 0) return <div>Sem eventos cadastrados</div>

  const formatPeriod = (start?: string | null, end?: string | null) => {
    if (!start && !end) return '-'
    const s = start ? dayjs(start).format('DD/MM/YYYY HH:mm') : '-'
    const e = end ? dayjs(end).format('DD/MM/YYYY HH:mm') : '-'
    return `${s} — ${e}`
  }

  const handleView = (ev: Event) => {
    if (onView) return onView(ev)
    // default: navigate to event detail page
    router.push(`/dashboard/eventos/${ev.id}`)
  }

  const handleReports = (ev: Event) => {
    if (onReports) return onReports(ev)
    // default: navigate to reports page for event
    router.push(`/dashboard/eventos/${ev.id}/relatorios`)
  }

  return (
    <div className="overflow-auto border rounded">
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th className="p-2 text-left whitespace-nowrap">Nome</th>
            <th className="p-2 text-left whitespace-nowrap">Período</th>
            <th className="p-2 text-left whitespace-nowrap">Local</th>
            <th className="p-2 text-left whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev.id} className="border-t">
              <td className="p-2 whitespace-nowrap truncate max-w-[28ch]">{ev.name}</td>
              <td className="p-2 whitespace-nowrap truncate max-w-[36ch]">{formatPeriod(ev.startDate, ev.endDate)}</td>
              <td className="p-2 whitespace-nowrap truncate max-w-[24ch]">{ev.location || '-'}</td>
              <td className="p-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleView(ev)}>Ver</Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit && onEdit(ev)}>Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => handleReports(ev)}>Relatórios</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EventTable
