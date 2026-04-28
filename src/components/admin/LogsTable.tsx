'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Log {
  id: string
  email: string
  model: string
  feature: string
  inputTokens: number
  outputTokens: number
  costUSD: number
  createdAt: string
}

interface LogsTableProps {
  adminSecret: string
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(4)}¢`
  return `$${usd.toFixed(4)}`
}

const FEATURE_LABELS: Record<string, { label: string; color: 'teal' | 'gold' | 'emerald' | 'navy' }> = {
  chat_turn:     { label: 'Chat', color: 'teal' },
  chat_feedback: { label: 'Feedback', color: 'gold' },
  cv_analysis:   { label: 'CV', color: 'emerald' },
}

const FEATURES = [
  { key: '', label: 'Tous' },
  { key: 'chat_turn', label: 'Chat' },
  { key: 'chat_feedback', label: 'Feedback' },
  { key: 'cv_analysis', label: 'CV' },
]

export default function LogsTable({ adminSecret }: LogsTableProps) {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [feature, setFeature] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (debouncedSearch) params.set('email', debouncedSearch)
      if (feature) params.set('feature', feature)
      const res = await fetch(`/api/admin/logs?${params}`, {
        headers: { 'x-admin-secret': adminSecret },
      })
      const body = await res.json()
      setLogs(body.data.logs)
      setTotal(body.data.total)
      setPages(body.data.pages)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [adminSecret, debouncedSearch, feature])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Rechercher par email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
        />
        <div className="flex gap-1 flex-wrap">
          {FEATURES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFeature(key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                feature === key ? 'bg-navy text-white' : 'bg-bg border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => fetchLogs(page)} variant="outline" size="sm">↻</Button>
      </div>

      <p className="text-text-muted text-xs mb-2">{total} logs</p>

      {loading ? (
        <p className="text-text-muted text-sm py-4 text-center">Chargement...</p>
      ) : logs.length === 0 ? (
        <p className="text-text-muted text-sm">Aucun log</p>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => {
            const feat = FEATURE_LABELS[log.feature] ?? { label: log.feature, color: 'navy' as const }
            return (
              <div key={log.id} className="flex justify-between items-start p-3 bg-bg rounded-lg text-sm gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium whitespace-nowrap overflow-hidden text-ellipsis">{log.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge color={feat.color} size="sm">{feat.label}</Badge>
                    <Badge color="navy" size="sm">{log.model}</Badge>
                    <p className="text-text-muted text-xs self-center">{log.inputTokens + log.outputTokens} tokens</p>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-semibold text-emerald font-mono">{formatCost(log.costUSD)}</p>
                  <p className="text-text-muted text-xs">{new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination — always visible when data loaded */}
      {total > 0 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>←</Button>
          <span className="text-text-secondary text-sm">{page} / {Math.max(1, pages)}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchLogs(page + 1)}>→</Button>
        </div>
      )}
    </div>
  )
}
