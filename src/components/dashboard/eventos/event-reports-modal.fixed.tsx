"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'
import { Event } from '@/types/event'

type AttendanceRow = {
  employee_id: string
  employee_name: string | null
  cpf?: string | null
  position?: string | null
  store?: string | null
  sector?: string | null
  role?: string | null
  isInternal?: boolean
  registered_at?: string | null
  registration_status?: string | null
  checkin_at?: string | null
  checkout_at?: string | null
  manual?: boolean
  note?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
}

export default function EventReportsModalFixed({ open, onOpenChange, event }: Props) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [exporting, setExporting] = useState<string | null>(null)

  const fmt = (v: any) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'N/A'

  useEffect(() => {
    if (!open || !event) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/events/attendance?eventId=${encodeURIComponent(event.id)}`)
        const json = await res.json()
        setRows(json.items || [])
      } catch (err) {
        console.error('load attendance', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, event])

  const downloadWorkbook = (wb: any, fileName: string) => {
    const XLSX = require('xlsx')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = async () => {
    if (!event) return
    setExporting('all')
    try {
      const res = await fetch(`/api/events/attendance?eventId=${encodeURIComponent(event.id)}`)
      const json = await res.json()
      const exportRows: AttendanceRow[] = json.items || []
      const XLSX = await import('xlsx')

      const presence = exportRows.filter((r) => r.checkin_at)
      const faltaram = exportRows.filter((r) => !r.checkin_at)
      const problemas = exportRows.filter((r) => r.checkin_at && !r.checkout_at)

      const mapRow = (r: any) => ({
        Nome: r.employee_name || r.employee_id,
        CPF: r.cpf || 'N/A',
        Cargo: r.position || 'N/A',
        Loja: r.store || 'N/A',
        Setor: r.sector || 'N/A',
        Funcao: r.isInternal === false ? (r.role || 'N/A') : 'N/A',
        Horario_CheckIn: fmt(r.checkin_at),
        Horario_CheckOut: fmt(r.checkout_at),
        Motivo_Nota: r.note || (r.manual ? 'Manual' : 'N/A'),
      })

      const ws1 = XLSX.utils.json_to_sheet(presence.map(mapRow))
      const ws2 = XLSX.utils.json_to_sheet(faltaram.map(mapRow))
      const ws3 = XLSX.utils.json_to_sheet(problemas.map(mapRow))
      const ws4 = XLSX.utils.json_to_sheet(faltaram.map((r) => ({ Nome: r.employee_name || r.employee_id, CPF: r.cpf || 'N/A', Cargo: r.position || 'N/A', Loja: r.store || 'N/A', Setor: r.sector || 'N/A', Funcao: r.isInternal === false ? (r.role || 'N/A') : 'N/A' })))

      const statsPretty = [
        { Metrica: 'Total Inscritos', Valor: exportRows.length },
        { Metrica: 'Total Presentes', Valor: presence.length },
        { Metrica: 'Total Ausentes', Valor: faltaram.length },
        { Metrica: 'Total Problemas (checkin sem checkout)', Valor: problemas.length },
      ]

      const ws5 = XLSX.utils.json_to_sheet(statsPretty)

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Presenca')
      XLSX.utils.book_append_sheet(wb, ws2, 'Faltaram')
      XLSX.utils.book_append_sheet(wb, ws3, 'Problemas')
      XLSX.utils.book_append_sheet(wb, ws4, 'Faltaram_min')
      XLSX.utils.book_append_sheet(wb, ws5, 'Percentuais')

      downloadWorkbook(wb, `${(event.name || 'evento').replace(/[^a-z0-9\-\_ ]/gi, '')}_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch (err) {
      console.error('export xlsx', err)
      alert('Erro ao exportar. Verifique se a dependência xlsx está instalada.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relatório do Evento</DialogTitle>
          <DialogDescription>Lista de presença e registros associados ao evento.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!event ? (
            <div>Evento não selecionado.</div>
          ) : loading ? (
            <div>Carregando...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground break-words">{event.name}</div>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <Button className="w-full sm:w-auto" disabled={!event || loading || exporting !== null} onClick={handleExportAll}>
                  {exporting === 'all' ? 'Exportando...' : 'Baixar XLSX (todas abas)'}
                </Button>
              </div>
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
