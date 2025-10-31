"use client"

import React, { useState } from 'react'
import { QRCodeReader } from '@/components/dashboard/qr-code-reader'
import { AuditTable } from '@/components/dashboard/auditoria/audit-table'
import { ManualRegisterDialog } from '@/components/dashboard/auditoria/manual-register-dialog'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { useToast } from '@/components/ui/toast-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function AuditoriaPage() {
  const breadcrumbs = [
    { title: 'Início', url: '/dashboard' },
    { title: 'Auditoria', url: '/dashboard/auditoria' }
  ]
  const [isQROpen, setIsQROpen] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [previewInfo, setPreviewInfo] = useState<any>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [checkoutAllOpen, setCheckoutAllOpen] = useState(false)
  const [isCheckingOutAll, setIsCheckingOutAll] = useState(false)
  const { addToast } = useToast()

  const handleScan = async (result: string) => {
    setScanResult(result)
    // Try exact lookup for employee by id
    try {
      const res = await fetch(`/api/auditoria/search-employees?q=${encodeURIComponent(result)}&exact=1`)
      const json = await res.json()
      const emp = (json.items && json.items[0]) || null
      if (!emp) {
        setPreviewInfo({ found: false, message: 'QR não corresponde a nenhum colaborador' })
        return
      }

      // fetch last entry
      const leRes = await fetch(`/api/auditoria/last-entries?employeeId=${emp.id}&limit=1`)
      const leJson = await leRes.json()
      const last = (leJson.items && leJson.items[0]) || null

      // determine next action
      let next = 'checkin'
      if (last && last.type === 'checkin') next = 'checkout'

      setPreviewInfo({ found: true, employee: emp, last, next })
    } catch (err) {
      console.error('handleScan preview', err)
      setPreviewInfo({ found: false, message: 'Erro ao buscar informações' })
    }
  }

  const performAction = async (type?: 'checkin'|'checkout') => {
    if (!previewInfo || !previewInfo.employee) return
    try {
      const payload: any = { employeeId: previewInfo.employee.id }
      if (type) payload.type = type
      const res = await fetch('/api/auditoria/perform', { method: 'POST', body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      // refresh the table
      setRefreshKey(k => k + 1)
      // update preview last
      handleScan(previewInfo.employee.id)
      alert('Registro realizado com sucesso')
    } catch (err: any) {
      console.error('performAction', err)
      alert(err?.message || String(err))
    }
  }

  const handleCheckoutAll = async () => {
    setIsCheckingOutAll(true)
    try {
      const res = await fetch('/api/auditoria/checkout-all', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        addToast(json.error, 'error')
      } else {
        addToast(json.message, 'success')
        setRefreshKey(k => k + 1)
      }
    } catch (err: any) {
      console.error('handleCheckoutAll', err)
      addToast('Erro ao realizar checkout em todos', 'error')
    } finally {
      setIsCheckingOutAll(false)
      setCheckoutAllOpen(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Histórico</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManualOpen(true)}>Registrar manual</Button>
              <Button onClick={() => setCheckoutAllOpen(true)}>Preparar para Evento</Button>
              <Button onClick={() => setRefreshKey(k => k + 1)}>Atualizar</Button>
            </div>
          </div>

          <div>
            <AuditTable key={refreshKey} />
          </div>

          <ManualRegisterDialog open={manualOpen} onOpenChange={setManualOpen} onRegistered={() => setRefreshKey(k => k + 1)} />

          <Dialog open={checkoutAllOpen} onOpenChange={setCheckoutAllOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Checkout em todos os colaboradores</DialogTitle>
                <DialogDescription>
                  Isso realizará checkout em todos os colaboradores, preparando-os para um novo evento. Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setCheckoutAllOpen(false)}>Cancelar</Button>
                <Button onClick={handleCheckoutAll} disabled={isCheckingOutAll}>
                  {isCheckingOutAll ? 'Processando...' : 'Confirmar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
