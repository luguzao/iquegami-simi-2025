"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type EmployeeOption = { id: string; name: string; cpf?: string }

export function ManualRegisterDialog({ open, onOpenChange, onRegistered }: { open: boolean; onOpenChange: (v: boolean) => void; onRegistered?: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EmployeeOption[]>([])
  const [selected, setSelected] = useState<EmployeeOption | null>(null)
  const [type, setType] = useState<'checkin'|'checkout'>('checkin')
  const [timestamp, setTimestamp] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastEntries, setLastEntries] = useState<any[]>([])

  useEffect(() => {
    if (query.length < 2) return setResults([])
    let mounted = true
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auditoria/search-employees?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (!mounted) return
        setResults(json.items || [])
      } catch (err) {
        console.error('search employees', err)
      }
    }, 250)
    return () => { mounted = false; clearTimeout(t) }
  }, [query])

  useEffect(() => {
    if (!selected) return setLastEntries([])
    const load = async () => {
      try {
        const res = await fetch(`/api/auditoria/last-entries?employeeId=${selected.id}&limit=5`)
        const json = await res.json()
        setLastEntries(json.items || [])
      } catch (err) {
        console.error('load last entries', err)
      }
    }
    load()
  }, [selected])

  const handleSubmit = async () => {
    if (!selected) return alert('Selecione um colaborador')
    setLoading(true)
    try {
      const payload = {
        employeeId: selected.id,
        manual: true,
        type,
        timestamp: timestamp || undefined,
        reason: reason || undefined,
      }
      const res = await fetch('/api/auditoria/perform', { method: 'POST', body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      onRegistered?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('manual register error', err)
      alert(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar presença / saída manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Buscar colaborador</Label>
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value.toUpperCase())} 
              placeholder="Busque por nome ou CPF" 
            />
            {results.length > 0 && (
              <div className="border rounded mt-1 max-h-40 overflow-auto bg-white">
                {results.map(r => (
                  <div key={r.id} className={`p-2 cursor-pointer hover:bg-gray-50 ${selected?.id === r.id ? 'bg-gray-100' : ''}`} onClick={() => { setSelected(r); setResults([]); setQuery(r.name) }}>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted">{r.cpf}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo</Label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border rounded">
                <option value="checkin">Check-in</option>
                <option value="checkout">Check-out</option>
              </select>
            </div>

            <div>
              <Label>Horário (opcional)</Label>
              <Input 
                type="datetime-local" 
                value={timestamp} 
                max="9999-12-31T23:59"
                onChange={(e) => setTimestamp(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <Label>Motivo (opcional)</Label>
            <textarea 
              className="w-full border rounded p-2" 
              value={reason} 
              onChange={(e) => setReason(e.target.value.toUpperCase())} 
            />
          </div>

          {selected && (
            <div>
              <Label>Últimos 5 registros</Label>
              <div className="mt-2 space-y-1">
                {lastEntries.length === 0 ? <div className="text-sm text-muted">Sem registros</div> : lastEntries.map((le: any) => (
                  <div key={le.id} className="text-sm">
                    <strong>{le.type}</strong> — {new Date(le.created_at).toLocaleString('pt-BR')} {le.manual ? '(manual)' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Registrando...' : 'Registrar'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
