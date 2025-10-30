"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/dashboard/colaboradores/pagination-controls'

type LogItem = {
  id: string
  employee_id: string
  qr_content: string | null
  type: 'checkin' | 'checkout'
  created_at: string
  note?: string | null
  manual?: boolean
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
      <div className="overflow-x-auto bg-white border rounded">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Data / Hora</th>
              <th className="py-2 px-4 border-b">Colaborador ID</th>
              <th className="py-2 px-4 border-b">Tipo</th>
              <th className="py-2 px-4 border-b">QR</th>
              <th className="py-2 px-4 border-b">Manual</th>
              <th className="py-2 px-4 border-b">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // show 6 skeleton rows matching the columns
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  <td className="py-2 px-4 border-b">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <Skeleton className="h-4 w-full" />
                  </td>
                  <td className="py-2 px-4 border-b">
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
                  <td className="py-2 px-4 border-b">{new Date(i.created_at).toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-4 border-b">{i.employee_id}</td>
                  <td className="py-2 px-4 border-b">{i.type}</td>
                  <td className="py-2 px-4 border-b break-all">{i.qr_content}</td>
                  <td className="py-2 px-4 border-b">{i.manual ? 'Sim' : 'Não'}</td>
                  <td className="py-2 px-4 border-b">{i.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
