'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import StatCard from '@/components/dashboard/StatCard'
import ScoreChart from '@/components/dashboard/ScoreChart'

interface DashboardStats {
  prenom: string | null
  messageCount: number
  avgScore: number
  cvScore: number | null
  scoreProgression: { date: string; score: number; type: 'chat' | 'cv' }[]
  topImprovements: string[]
  personalizedTips: string[]
  trends: { score: number | null; sessions: number | null }
  recentSessions: { id: string; title: string; createdAt: string; averageScore: number | null }[]
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((body) => setStats(body.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <p>{t('title')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary">
          {stats.prenom ? `${t('welcome')}, ${stats.prenom}` : t('title')}
        </h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('stats.messages')}
          value={stats.messageCount}
          color="teal"
          icon="chat"
        />
        <StatCard
          label={t('stats.avgScore')}
          value={stats.avgScore > 0 ? `${stats.avgScore}/100` : '—'}
          color="emerald"
          icon="trendingUp"
          trend={stats.trends.score !== null ? { value: stats.trends.score, label: t('stats.thisMonth') } : null}
        />
        <StatCard
          label={t('stats.cvScore')}
          value={stats.cvScore !== null ? `${stats.cvScore}/100` : t('stats.noCv')}
          color="gold"
          icon="award"
        />
        <StatCard
          label={t('stats.sessions')}
          value={stats.recentSessions.length}
          color="orange"
          icon="briefcase"
          trend={stats.trends.sessions !== null ? { value: stats.trends.sessions, label: t('stats.thisMonth') } : null}
        />
      </div>

      {/* Score progression + Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
        <Card padding="p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">{t('scoreChart.title')}</h2>
          <ScoreChart data={stats.scoreProgression} />
        </Card>

        <Card padding="p-5">
          <h2 className="text-base font-semibold text-text-primary mb-4">{t('quickActions.title')}</h2>
          <div className="flex flex-col gap-3">
            <Link href="/chat">
              <div className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border hover:border-emerald/50 hover:bg-emerald/5 transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-emerald/10 flex items-center justify-center shrink-0">
                  <Icon name="chat" size={18} color="var(--emerald)" />
                </div>
                <span className="text-sm font-medium text-text-primary flex-1">{t('quickActions.simulate')}</span>
                <Icon name="chevronRight" size={16} color="var(--text-secondary)" />
              </div>
            </Link>
            <Link href="/cv">
              <div className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border hover:border-gold/50 hover:bg-gold/5 transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Icon name="upload" size={18} color="var(--gold)" />
                </div>
                <span className="text-sm font-medium text-text-primary flex-1">{t('quickActions.analyzeCV')}</span>
                <Icon name="chevronRight" size={16} color="var(--text-secondary)" />
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Improvements + Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="p-5">
          <h2 className="text-base font-semibold text-text-primary mb-3">{t('improvements.title')}</h2>
          {stats.topImprovements.length === 0 ? (
            <p className="text-sm text-text-muted">{t('improvements.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.topImprovements.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="text-orange mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="p-5">
          <h2 className="text-base font-semibold text-text-primary mb-3">{t('tips.title')}</h2>
          {stats.personalizedTips.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-muted">{t('tips.empty')}</p>
              <Link href="/cv">
                <Button variant="primary" size="sm">{t('tips.uploadCv')}</Button>
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.personalizedTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="text-teal mt-0.5">★</span>{tip}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent sessions */}
      <Card padding="p-5">
        <h2 className="text-base font-semibold text-text-primary mb-3">{t('recentChats.title')}</h2>
        {stats.recentSessions.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">{t('recentChats.empty')}</p>
            <Link href="/chat">
              <Button variant="primary" size="sm">{t('recentChats.startNew')}</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.recentSessions.map((s) => (
              <Link key={s.id} href={`/chat?id=${s.id}`}>
                <div className="flex justify-between items-center p-3 bg-bg rounded-lg hover:bg-border transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{s.title}</p>
                    <p className="text-xs text-text-muted">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  {s.averageScore !== null ? (
                    <p className="text-sm font-semibold text-emerald">{Math.round(s.averageScore)}/100</p>
                  ) : (
                    <p className="text-sm text-text-muted">{t('recentChats.noScore')}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
