"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/dashboard/colaboradores/pagination-controls'

type LogItem = {
  id: string
  employee_id?: string
  qr_content?: string | null
  employee_name?: string | null
  employee_cpf?: string | null
  type: 'checkin' | 'checkout'
  created_at: string
  note?: string | null
  manual?: boolean
}

const formatCpf = (raw?: string | null) => {
  if (!raw) return '-'
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length !== 11) return raw
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function AuditTable() {
  const [items, setItems] = useState<LogItem[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchPage = async (p = page, pp = perPage) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/auditoria/logs?page=${p}&perPage=${pp}`)
      const json = await res.json()
      setItems(json.items || [])
      setTotal(json.total || 0)
    } catch (err) {
      console.error('fetch audit logs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPage(page, perPage) }, [page, perPage])

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + items.length

  return (
    <div>
      <div className="bg-white border rounded">
        {/* Desktop / larger screens: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
          <thead>
              <tr>
                <th className="py-2 px-4 border-b whitespace-nowrap">Data / Hora</th>
                <th className="py-2 px-4 border-b whitespace-nowrap">Nome</th>
                <th className="py-2 px-4 border-b whitespace-nowrap">CPF</th>
                <th className="py-2 px-4 border-b whitespace-nowrap">Tipo</th>
                <th className="py-2 px-4 border-b whitespace-nowrap">Manual</th>
                <th className="py-2 px-4 border-b">Motivo</th>
              </tr>
          </thead>
          <tbody>
            {loading ? (
              // show 6 skeleton rows matching the columns
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  <td className="py-2 px-4 border-b whitespace-nowrap">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">
                    <Skeleton className="h-4 w-8" />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr><td className="p-4" colSpan={6}>Sem registros</td></tr>
            ) : (
              items.map(i => (
                <tr key={i.id}>
                  <td className="py-2 px-4 border-b whitespace-nowrap">{new Date(i.created_at).toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-4 border-b">
                    <div className="font-medium">{i.employee_name || i.employee_id || '-'}</div>
                  </td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">{formatCpf(i.employee_cpf)}</td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">{i.type}</td>
                  <td className="py-2 px-4 border-b whitespace-nowrap">{i.manual ? 'Sim' : 'Não'}</td>
                  <td className="py-2 px-4 border-b">
                    <div className="truncate max-w-[36ch]" title={i.note || ''}>{i.note || '-'}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards for better readability */}
        <div className="block md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`mskel-${idx}`} className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="p-4">Sem registros</div>
          ) : (
            items.map(i => (
              <div key={i.id} className="p-3 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{new Date(i.created_at).toLocaleString('pt-BR')}</div>
                    <div className="text-sm text-muted-foreground">{i.employee_name || '-'}</div>
                    <div className="text-sm text-muted-foreground">CPF: <span className="font-medium">{formatCpf(i.employee_cpf)}</span></div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-2 py-1 rounded text-xs ${i.type === 'checkin' ? 'bg-green-100 text-green-800' : 'bg-sky-100 text-sky-800'}`}>{i.type}</div>
                    <div className="text-sm text-muted-foreground">{i.manual ? 'Manual' : 'Automático'}</div>
                  </div>
                </div>

                {i.note && <div className="mt-2 text-sm text-gray-600">Motivo: {i.note}</div>}
              </div>
            ))
          )}
        </div>
      </div>

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        itemsPerPage={perPage}
        totalItems={total}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={(p) => setPage(Math.max(1, Math.min(totalPages, p)))}
        onItemsPerPageChange={(n) => { setPerPage(n); setPage(1) }}
      />
    </div>
  )
}
