'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Event } from '@/types/event'
import dayjs from 'dayjs'
import { useToast } from '@/components/ui/toast-provider'

type Props = {
  event?: Event | null
  onCreated?: (item: Event) => void
  onUpdated?: (item: Event) => void
  onClose?: () => void
}

export function EventForm({ event, onCreated, onUpdated, onClose }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const isEditing = !!event?.id

  useEffect(() => {
    if (event) {
      setName(event.name || '')
      setDescription(event.description || '')
      setLocation(event.location || '')
      // Converter ISO string para formato datetime-local (YYYY-MM-DDTHH:mm)
      setStartDate(event.startDate ? dayjs(event.startDate).format('YYYY-MM-DDTHH:mm') : '')
      setEndDate(event.endDate ? dayjs(event.endDate).format('YYYY-MM-DDTHH:mm') : '')
    } else {
      // Reset form quando em modo criação
      setName('')
      setDescription('')
      setLocation('')
      setStartDate('')
      setEndDate('')
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = isEditing ? `/api/events/update/${event.id}` : '/api/events/create'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, startDate, endDate })
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      // normalize backend snake_case -> frontend camelCase
      const i = json.item || {}
      const mapped: Event = {
        id: i.id,
        name: i.name,
        description: i.description || i.desc || null,
        location: i.location || null,
        startDate: i.start_date || i.startDate || null,
        endDate: i.end_date || i.endDate || null,
        createdAt: i.created_at || i.createdAt || null,
      }

      if (isEditing && onUpdated) {
        onUpdated(mapped)
        addToast('Evento atualizado com sucesso!', 'success')
      } else if (!isEditing && onCreated) {
        onCreated(mapped)
        addToast('Evento criado com sucesso!', 'success')
      }

      if (onClose) onClose()
    } catch (err) {
      console.error('save event', err)
      const message = (err as any)?.message || String(err)
      addToast(`Erro ao salvar evento: ${message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <Label>Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <Label>Local</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data início</Label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Data fim</Label>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
        </Button>
        <Button variant="ghost" onClick={() => onClose && onClose()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export default EventForm
