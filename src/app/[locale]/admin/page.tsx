'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  topUsers: {
    email: string
    totalCost: number
    totalCalls: number
  }[]
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(4)}¢`
  return `$${usd.toFixed(4)}`
}

export default function AdminPage() {
  const t = useTranslations('admin')
  const [stats, setStats] = useState<Stats | null>(null)
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchStats = async (s?: string) => {
    const adminSecret = s ?? secret
    if (!adminSecret) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-secret': adminSecret },
      })
      if (!res.ok) {
        setError(t('invalidSecret'))
        return
      }
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
        <Card padding="32px" style={{ width: '100%', maxWidth: '400px' }}>
          <h1 className="text-2xl font-display font-bold mb-6 text-text-primary">
            {t('loginTitle')}
          </h1>

          {error && (
            <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <Input
            type="password"
            placeholder={t('adminSecret')}
            value={secret}
            onChange={setSecret}
            style={{ marginBottom: '16px' }}
          />

          <Button
            onClick={() => fetchStats()}
            disabled={loading || !secret}
            fullWidth
            variant="primary"
          >
            {loading ? t('loading') : t('access')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 bg-bg">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display font-bold text-text-primary">
            {t('dashboard')}
          </h1>
          <Button onClick={() => fetchStats()} variant="outline">
            {t('refresh')}
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
          {[
            { label: t('stats.totalUsers'), value: stats.overview.totalUsers, color: 'emerald' },
            { label: t('stats.totalSessions'), value: stats.overview.totalSessions, color: 'teal' },
            { label: t('stats.totalMessages'), value: stats.overview.totalLLMCalls, color: 'gold' },
            { label: t('stats.costToday'), value: formatCost(stats.overview.costToday), color: 'orange' },
            { label: t('stats.costMonth'), value: formatCost(stats.overview.costMonth), color: 'pink' },
            { label: t('stats.costAllTime'), value: formatCost(stats.overview.costAllTime), color: 'navy' },
          ].map((item, idx) => (
            <Card key={idx} padding="16px">
              <p className="text-xs text-text-secondary mb-2 uppercase font-semibold">
                {item.label}
              </p>
              <p
                className="text-3xl font-bold"
                style={{
                  color: `var(--${item.color})`,
                }}
              >
                {item.value}
              </p>
            </Card>
          ))}
        </div>

        {/* Top Users & Logs */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
          {/* Top Users */}
          <Card padding="20px">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t('topUsers')}
            </h2>
            {stats.topUsers.length === 0 ? (
              <p className="text-text-muted text-sm">{t('noData')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.topUsers.map((u, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 bg-bg rounded-lg text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                        {u.email}
                      </p>
                      <p className="text-text-muted text-xs">
                        {u.totalCalls} {t('calls')}
                      </p>
                    </div>
                    <p className="font-semibold text-gold font-mono whitespace-nowrap ml-2">
                      {formatCost(u.totalCost)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Logs */}
          <Card padding="20px">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t('recentLogs')}
            </h2>
            {stats.recentLogs.length === 0 ? (
              <p className="text-text-muted text-sm">{t('noLogs')}</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {stats.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex justify-between items-start p-3 bg-bg rounded-lg text-sm gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {log.email}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge color="navy" size="sm">
                          {log.model}
                        </Badge>
                        <p className="text-text-muted text-xs">
                          {log.inputTokens + log.outputTokens} tokens
                        </p>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-semibold text-emerald font-mono">
                        {formatCost(log.costUSD)}
                      </p>
                      <p className="text-text-muted text-xs">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
