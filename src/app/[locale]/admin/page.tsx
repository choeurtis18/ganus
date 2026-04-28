'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UserTable from '@/components/admin/UserTable'
import LogsTable from '@/components/admin/LogsTable'

interface Stats {
  overview: {
    totalUsers: number
    totalSessions: number
    totalLLMCalls: number
    costToday: number
    costMonth: number
    costAllTime: number
  }
  recentLogs: {
    id: string
    email: string
    model: string
    feature: string
    inputTokens: number
    outputTokens: number
    costUSD: number
    createdAt: string
  }[]
  topUsers: { email: string; totalCost: number; totalCalls: number }[]
}

type Tab = 'stats' | 'users' | 'logs' | 'storage'

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(4)}¢`
  return `$${usd.toFixed(4)}`
}

const FEATURE_LABELS: Record<string, { label: string; color: 'teal' | 'gold' | 'emerald' | 'navy' }> = {
  chat_turn:     { label: 'Chat', color: 'teal' },
  chat_feedback: { label: 'Feedback', color: 'gold' },
  cv_analysis:   { label: 'CV', color: 'emerald' },
}

export default function AdminPage() {
  const t = useTranslations('admin')
  const [stats, setStats] = useState<Stats | null>(null)
  const [secret, setSecret] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('stats')
  const [storage, setStorage] = useState<{ fileCount: number; totalSizeBytes: number } | null>(null)
  const [storageLoading, setStorageLoading] = useState(false)

  // Auto-reconnect if secret already in session
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret')
    if (saved && !stats) fetchStats(saved)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async (s?: string) => {
    const adminSecret = s ?? secret
    if (!adminSecret) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-secret': adminSecret },
      })
      if (!res.ok) { setError(t('invalidSecret')); sessionStorage.removeItem('admin_secret'); return }
      sessionStorage.setItem('admin_secret', adminSecret)
      const body = await res.json()
      setStats(body.data ?? body)
    } catch {
      setError(t('connectionError'))
    } finally {
      setLoading(false)
    }
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <Card padding="p-8" className="w-full max-w-sm">
          <h1 className="text-2xl font-display font-bold mb-6 text-text-primary">
            {t('loginTitle')}
          </h1>
          {error && (
            <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm mb-4">{error}</div>
          )}
          <div className="mb-4">
            <Input
              type="password"
              placeholder={t('adminSecret')}
              value={secret}
              onChange={setSecret}
            />
          </div>
          <Button onClick={() => fetchStats()} disabled={loading || !secret} fullWidth variant="primary">
            {loading ? t('loading') : t('access')}
          </Button>
        </Card>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats', label: t('tabs.stats') },
    { id: 'users', label: t('tabs.users') },
    { id: 'logs', label: t('tabs.logs') },
    { id: 'storage', label: t('tabs.storage') },
  ]

  return (
    <div className="p-4 sm:p-6 bg-bg min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-text-primary">{t('dashboard')}</h1>
          <Button onClick={() => fetchStats()} variant="outline">{t('refresh')}</Button>
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1 w-fit min-w-full sm:min-w-0">
            {tabs.map((t2) => (
              <button
                key={t2.id}
                onClick={() => setTab(t2.id)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t2.id
                    ? 'bg-navy text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t2.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'stats' && (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
              {[
                { label: t('stats.totalUsers'), value: stats.overview.totalUsers, color: 'emerald' },
                { label: t('stats.totalSessions'), value: stats.overview.totalSessions, color: 'teal' },
                { label: t('stats.totalMessages'), value: stats.overview.totalLLMCalls, color: 'gold' },
                { label: t('stats.costToday'), value: formatCost(stats.overview.costToday), color: 'orange' },
                { label: t('stats.costMonth'), value: formatCost(stats.overview.costMonth), color: 'pink' },
                { label: t('stats.costAllTime'), value: formatCost(stats.overview.costAllTime), color: 'navy' },
              ].map((item, idx) => (
                <Card key={idx} padding="p-4">
                  <p className="text-xs text-text-secondary mb-2 uppercase font-semibold">{item.label}</p>
                  <p className="text-3xl font-bold" style={{ color: `var(--${item.color})` }}>{item.value}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-6">
              <Card padding="p-5">
                <h2 className="text-lg font-semibold text-text-primary mb-4">{t('topUsers')}</h2>
                {stats.topUsers.length === 0 ? (
                  <p className="text-text-muted text-sm">{t('noData')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stats.topUsers.map((u, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-bg rounded-lg text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</p>
                          <p className="text-text-muted text-xs">{u.totalCalls} {t('calls')}</p>
                        </div>
                        <p className="font-semibold text-gold font-mono whitespace-nowrap ml-2">{formatCost(u.totalCost)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {tab === 'users' && (
          <Card padding="p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">{t('users.title')}</h2>
            <UserTable adminSecret={secret} />
          </Card>
        )}

        {tab === 'logs' && (
          <Card padding="p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">{t('logs.title')}</h2>
            <LogsTable adminSecret={secret} />
          </Card>
        )}

        {tab === 'storage' && (
          <Card padding="p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-text-primary">{t('storage.title')}</h2>
              <Button
                variant="outline"
                size="sm"
                disabled={storageLoading}
                onClick={async () => {
                  setStorageLoading(true)
                  try {
                    const res = await fetch('/api/admin/storage', { headers: { 'x-admin-secret': secret } })
                    const body = await res.json()
                    setStorage(body.data)
                  } finally {
                    setStorageLoading(false)
                  }
                }}
              >
                {storageLoading ? '...' : storage ? '↻' : 'Charger'}
              </Button>
            </div>
            {!storage ? (
              <p className="text-text-muted text-sm">{t('storage.noData')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-2 uppercase font-semibold">{t('storage.cvCount')}</p>
                  <p className="text-3xl font-bold text-teal">{storage.fileCount}</p>
                </div>
                <div className="bg-bg rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-2 uppercase font-semibold">{t('storage.totalSize')}</p>
                  <p className="text-3xl font-bold text-gold">
                    {storage.totalSizeBytes < 1024 * 1024
                      ? `${(storage.totalSizeBytes / 1024).toFixed(1)} KB`
                      : `${(storage.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
