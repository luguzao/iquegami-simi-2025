'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Event } from '@/types/event'
import EventForm from './event-form'
import { useToast } from '@/components/ui/toast-provider'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
  onUpdated?: (item: Event) => void
}

export function EventEditModal({ open, onOpenChange, event, onUpdated }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
          <DialogDescription>Atualize as informações do evento selecionado.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!event ? (
            <div>Evento não selecionado.</div>
          ) : (
            <EventForm
              event={event}
              onUpdated={(updated) => {
                if (onUpdated) onUpdated(updated)
                onOpenChange(false)
              }}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EventEditModal
