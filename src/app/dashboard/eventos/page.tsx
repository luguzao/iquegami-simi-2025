'use client'

import React, { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import EventTable from '@/components/dashboard/eventos/event-table'
import EventForm from '@/components/dashboard/eventos/event-form'
import EventDetailModal from '@/components/dashboard/eventos/event-detail-modal'
import EventEditModal from '@/components/dashboard/eventos/event-edit-modal'
import EventReportsModal from '@/components/dashboard/eventos/event-reports-modal'
import { Event } from '@/types/event'

export default function EventosPage() {
  const breadcrumbs = [
    { title: 'Início', url: '/dashboard' },
    { title: 'Eventos', url: '/dashboard/eventos' }
  ]

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events/list')
      const json = await res.json()
      const items = json.items || []
      // Normalize snake_case (from backend) to camelCase used by frontend
      const mapped = items.map((i: any) => ({
        id: i.id,
        name: i.name,
        description: i.description || i.desc || null,
        location: i.location || null,
        startDate: i.start_date || i.startDate || null,
        endDate: i.end_date || i.endDate || null,
        createdAt: i.created_at || i.createdAt || null,
      })) as Event[]
      setEvents(mapped)
    } catch (err) {
      console.error('load events', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Eventos</h3>
            <div className="flex gap-2">
              <Button onClick={() => setOpenForm(true)}>Novo evento</Button>
              <Button variant="outline" onClick={() => load()}>
                Atualizar
              </Button>
            </div>
          </div>

          {openForm && (
            <div className="p-4 border rounded">
              <EventForm
                onCreated={(item) => {
                  setEvents((prev) => [item, ...prev])
                  setOpenForm(false)
                }}
                onClose={() => {
                  setOpenForm(false)
                }}
              />
            </div>
          )}

          <EventDetailModal
            open={detailOpen}
            onOpenChange={(o: boolean) => {
              if (!o) setSelectedEvent(null)
              setDetailOpen(o)
            }}
            event={selectedEvent}
          />

          <EventEditModal
            open={editOpen}
            onOpenChange={(o: boolean) => {
              if (!o) setEditingEvent(null)
              setEditOpen(o)
            }}
            event={editingEvent}
            onUpdated={(item) => {
              setEvents((prev) => prev.map((e) => (e.id === item.id ? item : e)))
            }}
          />

          <EventReportsModal
            open={reportsOpen}
            onOpenChange={(o: boolean) => {
              if (!o) setSelectedEvent(null)
              setReportsOpen(o)
            }}
            event={selectedEvent}
          />

          <div>
            {loading ? (
              <div>Carregando...</div>
            ) : (
              <EventTable
                events={events}
                onView={(ev) => {
                  setSelectedEvent(ev)
                  setDetailOpen(true)
                }}
                onEdit={(ev) => {
                  setEditingEvent(ev)
                  setEditOpen(true)
                }}
                onReports={(ev) => {
                  setSelectedEvent(ev)
                  setReportsOpen(true)
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
