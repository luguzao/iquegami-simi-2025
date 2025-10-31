'use client'

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

export default function EventReportsModal({ open, onOpenChange, event }: Props) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [exporting, setExporting] = useState<string | null>(null)

  const fmt = (v: any) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'N/A')

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
        Funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
        Horario_CheckIn: fmt(r.checkin_at),
        Horario_CheckOut: fmt(r.checkout_at),
        Motivo_Nota: r.note || (r.manual ? 'Manual' : 'N/A'),
      })

      const ws1 = XLSX.utils.json_to_sheet(presence.map(mapRow))
      const ws2 = XLSX.utils.json_to_sheet(faltaram.map(mapRow))
      const ws3 = XLSX.utils.json_to_sheet(problemas.map(mapRow))
      const ws4 = XLSX.utils.json_to_sheet(
        faltaram.map((r) => ({ Nome: r.employee_name || r.employee_id, CPF: r.cpf || 'N/A', Cargo: r.position || 'N/A', Loja: r.store || 'N/A', Setor: r.sector || 'N/A', Funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A' }))
      )

      const total_registered = exportRows.length
      const total_present = presence.length
      const total_absent = faltaram.length
      const total_problems = problemas.length
      const manual_checkins = exportRows.filter((r) => r.manual === true).length
      const percent = (v: number) => (total_registered === 0 ? 0 : Math.round((v / total_registered) * 10000) / 100)

      const statsPretty = [
        { Metrica: 'Total Inscritos', Valor: total_registered },
        { Metrica: 'Total Presentes', Valor: total_present },
        { Metrica: 'Total Ausentes', Valor: total_absent },
        { Metrica: 'Total Problemas (checkin sem checkout)', Valor: total_problems },
        { Metrica: 'Check-ins Manuais', Valor: manual_checkins },
        { Metrica: '% Presentes', Valor: `${percent(total_present).toFixed(2)}%` },
        { Metrica: '% Ausentes', Valor: `${percent(total_absent).toFixed(2)}%` },
        { Metrica: '% Problemas', Valor: `${percent(total_problems).toFixed(2)}%` },
        { Metrica: '% Check-ins Manuais', Valor: `${percent(manual_checkins).toFixed(2)}%` },
      ]

      const ws5 = XLSX.utils.json_to_sheet(statsPretty)

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Presenca')
      XLSX.utils.book_append_sheet(wb, ws2, 'Faltaram')
      XLSX.utils.book_append_sheet(wb, ws3, 'Problemas')
      XLSX.utils.book_append_sheet(wb, ws4, 'Faltaram_min')
      XLSX.utils.book_append_sheet(wb, ws5, 'Percentuais')

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fileNameSafe = (event.name || 'evento').replace(/[^a-z0-9\-\_ ]/gi, '')
      a.href = url
      a.download = `${fileNameSafe}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('export xlsx', err)
      alert('Erro ao exportar. Verifique se a dependência xlsx está instalada.')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPresenca = async () => {
    if (!event) return
    setExporting('presenca')
    try {
      const res = await fetch(`/api/events/attendance?eventId=${encodeURIComponent(event.id)}`)
      const json = await res.json()
      const exportRows: AttendanceRow[] = json.items || []
      const XLSX = await import('xlsx')
      const presence = exportRows.filter((r) => r.checkin_at)
      const ws = XLSX.utils.json_to_sheet(
        presence.map((r: any) => ({
          Nome: r.employee_name || r.employee_id,
          CPF: r.cpf || 'N/A',
          Cargo: r.position || 'N/A',
          Loja: r.store || 'N/A',
          Setor: r.sector || 'N/A',
          Funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
          Horario_CheckIn: fmt(r.checkin_at),
          Horario_CheckOut: fmt(r.checkout_at),
          Motivo_Nota: r.note || (r.manual ? 'Manual' : 'N/A'),
        }))
      )
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Presenca')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fileNameSafe = (event.name || 'evento').replace(/[^a-z0-9\-\_ ]/gi, '')
      a.href = url
      a.download = `${fileNameSafe}_presenca_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('export presenca', err)
      alert('Erro ao exportar presenca')
    } finally {
      setExporting(null)
    }
  }

  const handleExportFaltaram = async () => {
    if (!event) return
    setExporting('faltaram')
    try {
      const res = await fetch(`/api/events/attendance?eventId=${encodeURIComponent(event.id)}`)
      const json = await res.json()
      const exportRows: AttendanceRow[] = json.items || []
      const XLSX = await import('xlsx')
      const faltaram = exportRows.filter((r) => !r.checkin_at)
      const ws = XLSX.utils.json_to_sheet(
        faltaram.map((r: any) => ({
          Nome: r.employee_name || r.employee_id,
          CPF: r.cpf || 'N/A',
          Cargo: r.position || 'N/A',
          Loja: r.store || 'N/A',
          Setor: r.sector || 'N/A',
          Funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
          Motivo_Nota: r.note || (r.manual ? 'Manual' : 'N/A'),
        }))
      )
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Faltaram')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fileNameSafe = (event.name || 'evento').replace(/[^a-z0-9\-\_ ]/gi, '')
      a.href = url
      a.download = `${fileNameSafe}_faltaram_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('export faltaram', err)
      alert('Erro ao exportar faltaram')
    } finally {
      setExporting(null)
    }
  }

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

                {/* <Button className="w-full sm:w-auto" disabled={!event || loading || exporting !== null} onClick={handleExportPresenca}>
                  {exporting === 'presenca' ? 'Exportando...' : 'Exportar Presença'}
                </Button>

                <Button className="w-full sm:w-auto" disabled={!event || loading || exporting !== null} onClick={handleExportFaltaram}>
                  {exporting === 'faltaram' ? 'Exportando...' : 'Exportar Faltaram'}
                </Button> */}
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
