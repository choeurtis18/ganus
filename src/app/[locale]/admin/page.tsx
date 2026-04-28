'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UserTable from '@/components/admin/UserTable'

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
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('stats')
  const [logSearch, setLogSearch] = useState('')
  const [logFeature, setLogFeature] = useState<string>('all')

  const fetchStats = async (s?: string) => {
    const adminSecret = s ?? secret
    if (!adminSecret) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-secret': adminSecret },
      })
      if (!res.ok) { setError(t('invalidSecret')); return }
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

        {tab === 'logs' && (() => {
          const filteredLogs = stats.recentLogs.filter((log) => {
            const matchSearch = log.email.toLowerCase().includes(logSearch.toLowerCase())
            const matchFeature = logFeature === 'all' || log.feature === logFeature
            return matchSearch && matchFeature
          })
          return (
            <Card padding="p-5">
              <h2 className="text-lg font-semibold text-text-primary mb-4">{t('logs.title')}</h2>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Rechercher par email..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
                />
                <div className="flex gap-1 flex-wrap">
                  {[
                    { key: 'all', label: 'Tous' },
                    { key: 'chat_turn', label: 'Chat' },
                    { key: 'chat_feedback', label: 'Feedback' },
                    { key: 'cv_analysis', label: 'CV' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setLogFeature(key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        logFeature === key ? 'bg-navy text-white' : 'bg-bg border border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-text-muted text-xs mb-2">{filteredLogs.length} / {stats.recentLogs.length} logs</p>

              {filteredLogs.length === 0 ? (
                <p className="text-text-muted text-sm">{t('noLogs')}</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                  {filteredLogs.map((log) => {
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
            </Card>
          )
        })()}

        {tab === 'storage' && (
          <Card padding="p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">{t('storage.title')}</h2>
            <p className="text-text-muted text-sm">{t('storage.noData')}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
