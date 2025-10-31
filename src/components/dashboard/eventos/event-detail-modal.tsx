"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'
import { Event } from '@/types/event'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
}

export function EventDetailModal({ open, onOpenChange, event }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes do Evento</DialogTitle>
          <DialogDescription>Informações básicas do evento selecionado.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!event ? (
            <div>Evento não selecionado.</div>
          ) : (
            <div className="flex flex-col gap-2">
              <div><strong>Nome:</strong> {event.name}</div>
              <div><strong>Local:</strong> {event.location || '-'}</div>
              <div><strong>Período:</strong> {event.startDate ? dayjs(event.startDate).format('DD/MM/YYYY HH:mm') : '-'} — {event.endDate ? dayjs(event.endDate).format('DD/MM/YYYY HH:mm') : '-'}</div>
              <div><strong>Descrição:</strong> {event.description || '-'}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EventDetailModal
