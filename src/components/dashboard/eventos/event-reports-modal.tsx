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
  attendance_day?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
}

export default function EventReportsModal({ open, onOpenChange, event }: Props) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState<string>('')

  const fmt = (v: any) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'N/A')

  const handleExportAll = async () => {
    if (!event) return
    setExporting('all')
    setExportProgress('Iniciando exportação...')
    
    try {
      setExportProgress('Carregando dados...')
      const res = await fetch(`/api/events/attendance?eventId=${encodeURIComponent(event.id)}`)
      const json = await res.json()
      const exportRows: AttendanceRow[] = json.items || []
      
      setExportProgress(`Processando ${exportRows.length} registros...`)
      
      let ExcelJS
      try {
        ExcelJS = await import('exceljs')
      } catch (importError) {
        console.error('Erro ao importar exceljs:', importError)
        alert('Erro ao carregar biblioteca de exportação. Verifique se a dependência exceljs está instalada corretamente.')
        return
      }

      const workbook = new ExcelJS.default.Workbook()

      // Calcular os dias do evento
      const startDate = dayjs(event.startDate)
      const endDate = dayjs(event.endDate)
      const eventDays: dayjs.Dayjs[] = []

      let currentDay = startDate.startOf('day')
      while (currentDay.isBefore(endDate.endOf('day')) || currentDay.isSame(endDate, 'day')) {
        eventDays.push(currentDay)
        currentDay = currentDay.add(1, 'day')
      }

      setExportProgress(`Agrupando dados por ${eventDays.length} dias...`)
      
      // 🚀 OTIMIZAÇÃO: Agrupar dados por dia primeiro (O(n) em vez de O(dias × n))
      const dataByDay: { [key: string]: { presence: any[], absent: any[], manual: number } } = {}
      const totalStats = { registered: 0, present: 0, absent: 0, manual: 0 }

      // Inicializar estrutura para cada dia
      eventDays.forEach(day => {
        const dayKey = day.format('YYYY-MM-DD')
        dataByDay[dayKey] = { presence: [], absent: [], manual: 0 }
      })

      // Processar todos os registros uma única vez
      exportRows.forEach((employee: any) => {
        const dayKey = employee.attendance_day
        if (dataByDay[dayKey]) {
          if (employee.checkin_at) {
            dataByDay[dayKey].presence.push(employee)
            totalStats.present++
            if (employee.manual) {
              dataByDay[dayKey].manual++
              totalStats.manual++
            }
          } else {
            dataByDay[dayKey].absent.push(employee)
            totalStats.absent++
          }
        }
        totalStats.registered++
      })

      setExportProgress('Gerando planilhas Excel...')

      // Função auxiliar para calcular percentual
      const percent = (v: number, total: number) => (total === 0 ? 0 : Math.round((v / total) * 10000) / 100)

      // Criar planilhas para cada dia
      eventDays.forEach((day, index) => {
        const dayKey = day.format('YYYY-MM-DD')
        const dayStr = day.format('DD-MM')
        const dayData = dataByDay[dayKey]

        // Criar aba de presenças do dia
        if (dayData.presence.length > 0 || dayData.absent.length > 0) {
          const worksheet = workbook.addWorksheet(`Presenças ${dayStr}`)
          worksheet.columns = [
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'CPF', key: 'cpf', width: 15 },
            { header: 'Cargo', key: 'cargo', width: 25 },
            { header: 'Loja', key: 'loja', width: 10 },
            { header: 'Setor', key: 'setor', width: 20 },
            { header: 'Função', key: 'funcao', width: 20 },
            { header: 'Horario_CheckIn', key: 'checkin', width: 20 },
            { header: 'Horario_CheckOut', key: 'checkout', width: 20 },
            { header: 'Motivo_Nota', key: 'nota', width: 30 },
          ]

          dayData.presence.forEach((r: any) => {
            const name = r.employee_name && r.employee_name !== 'N/A' ? r.employee_name :
                        r.name ? r.name :
                        r.employee_id ? `ID: ${r.employee_id}` : 'N/A'
            worksheet.addRow({
              nome: name,
              cpf: r.cpf || 'N/A',
              cargo: r.position || 'N/A',
              loja: r.store || 'N/A',
              setor: r.sector || 'N/A',
              funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
              checkin: fmt(r.checkin_at),
              checkout: fmt(r.checkout_at),
              nota: r.note || (r.manual ? 'Manual' : 'N/A'),
            })
          })
        }

        // Criar aba de faltas do dia
        if (dayData.absent.length > 0) {
          const worksheet = workbook.addWorksheet(`Faltas ${dayStr}`)
          worksheet.columns = [
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'CPF', key: 'cpf', width: 15 },
            { header: 'Cargo', key: 'cargo', width: 25 },
            { header: 'Loja', key: 'loja', width: 10 },
            { header: 'Setor', key: 'setor', width: 20 },
            { header: 'Função', key: 'funcao', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
          ]

          dayData.absent.forEach((r: any) => {
            const name = r.employee_name && r.employee_name !== 'N/A' ? r.employee_name :
                        r.name ? r.name :
                        r.employee_id ? `ID: ${r.employee_id}` : 'N/A'
            worksheet.addRow({
              nome: name,
              cpf: r.cpf || 'N/A',
              cargo: r.position || 'N/A',
              loja: r.store || 'N/A',
              setor: r.sector || 'N/A',
              funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
              status: 'Ausente',
            })
          })
        }

        // Criar aba de percentuais do dia
        const dayTotal = dayData.presence.length + dayData.absent.length
        if (dayTotal > 0) {
          const percentWorksheet = workbook.addWorksheet(`Percentual ${dayStr}`)
          percentWorksheet.columns = [
            { header: 'Métrica', key: 'metrica', width: 40 },
            { header: 'Valor', key: 'valor', width: 20 },
          ]

          const dayStatsData = [
            { metrica: 'Total Participantes', valor: dayTotal },
            { metrica: 'Total Presentes', valor: dayData.presence.length },
            { metrica: 'Total Ausentes', valor: dayData.absent.length },
            { metrica: 'Check-ins Manuais', valor: dayData.manual },
            { metrica: '% Presentes', valor: `${percent(dayData.presence.length, dayTotal).toFixed(2)}%` },
            { metrica: '% Ausentes', valor: `${percent(dayData.absent.length, dayTotal).toFixed(2)}%` },
            { metrica: '% Check-ins Manuais', valor: `${percent(dayData.manual, dayTotal).toFixed(2)}%` },
          ]

          dayStatsData.forEach(stat => {
            percentWorksheet.addRow(stat)
          })
        }
      })

      setExportProgress('Gerando estatísticas...')
      
      // Criar aba de percentuais consolidada
      const percentTotal = (v: number) => (totalStats.registered === 0 ? 0 : Math.round((v / totalStats.registered) * 10000) / 100)

      const statsWorksheet = workbook.addWorksheet('Percentual Geral')
      statsWorksheet.columns = [
        { header: 'Métrica', key: 'metrica', width: 40 },
        { header: 'Valor', key: 'valor', width: 20 },
      ]

      const statsData = [
        { metrica: 'Total Inscritos', valor: totalStats.registered },
        { metrica: 'Total Presentes', valor: totalStats.present },
        { metrica: 'Total Ausentes', valor: totalStats.absent },
        { metrica: 'Check-ins Manuais', valor: totalStats.manual },
        { metrica: '% Presentes', valor: `${percentTotal(totalStats.present).toFixed(2)}%` },
        { metrica: '% Ausentes', valor: `${percentTotal(totalStats.absent).toFixed(2)}%` },
        { metrica: '% Check-ins Manuais', valor: `${percentTotal(totalStats.manual).toFixed(2)}%` },
      ]

      statsData.forEach(stat => {
        statsWorksheet.addRow(stat)
      })

      setExportProgress('Finalizando arquivo Excel...')
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fileNameSafe = (event.name || 'evento').replace(/[^a-z0-9\-\_ ]/gi, '')
      a.href = url
      a.download = `${fileNameSafe}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      
      setExportProgress('')
    } catch (err) {
      console.error('export exceljs', err)
      alert('Erro ao exportar. Verifique se a dependência exceljs está instalada.')
      setExportProgress('')
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
      
      let ExcelJS
      try {
        ExcelJS = await import('exceljs')
      } catch (importError) {
        console.error('Erro ao importar exceljs:', importError)
        alert('Erro ao carregar biblioteca de exportação. Verifique se a dependência exceljs está instalada corretamente.')
        return
      }

      const workbook = new ExcelJS.default.Workbook()
      const worksheet = workbook.addWorksheet('Presença')
      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'CPF', key: 'cpf', width: 15 },
        { header: 'Cargo', key: 'cargo', width: 25 },
        { header: 'Loja', key: 'loja', width: 10 },
        { header: 'Setor', key: 'setor', width: 20 },
        { header: 'Função', key: 'funcao', width: 20 },
        { header: 'Horario_CheckIn', key: 'checkin', width: 20 },
        { header: 'Horario_CheckOut', key: 'checkout', width: 20 },
        { header: 'Motivo_Nota', key: 'nota', width: 30 },
      ]

      const presence = exportRows.filter((r) => r.checkin_at)
      presence.forEach((r: any) => {
        const name = r.employee_name && r.employee_name !== 'N/A' ? r.employee_name :
                    r.name ? r.name :
                    r.employee_id ? `ID: ${r.employee_id}` : 'N/A'
        worksheet.addRow({
          nome: name,
          cpf: r.cpf || 'N/A',
          cargo: r.position || 'N/A',
          loja: r.store || 'N/A',
          setor: r.sector || 'N/A',
          funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
          checkin: fmt(r.checkin_at),
          checkout: fmt(r.checkout_at),
          nota: r.note || (r.manual ? 'Manual' : 'N/A'),
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
      
      let ExcelJS
      try {
        ExcelJS = await import('exceljs')
      } catch (importError) {
        console.error('Erro ao importar exceljs:', importError)
        alert('Erro ao carregar biblioteca de exportação. Verifique se a dependência exceljs está instalada corretamente.')
        return
      }

      const workbook = new ExcelJS.default.Workbook()
      const worksheet = workbook.addWorksheet('Faltaram')
      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'CPF', key: 'cpf', width: 15 },
        { header: 'Cargo', key: 'cargo', width: 25 },
        { header: 'Loja', key: 'loja', width: 10 },
        { header: 'Setor', key: 'setor', width: 20 },
        { header: 'Função', key: 'funcao', width: 20 },
      ]

      const faltaram = exportRows.filter((r) => !r.checkin_at)
      faltaram.forEach((r: any) => {
        const name = r.employee_name && r.employee_name !== 'N/A' ? r.employee_name :
                    r.name ? r.name :
                    r.employee_id ? `ID: ${r.employee_id}` : 'N/A'
        worksheet.addRow({
          nome: name,
          cpf: r.cpf || 'N/A',
          cargo: r.position || 'N/A',
          loja: r.store || 'N/A',
          setor: r.sector || 'N/A',
          funcao: r.isInternal === false ? r.role || 'N/A' : 'N/A',
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground break-words">{event.name}</div>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <Button className="w-full sm:w-auto" disabled={!event || exporting !== null} onClick={handleExportAll}>
                  {exporting === 'all' ? (exportProgress || 'Exportando...') : 'Baixar XLSX (todas abas)'}
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
