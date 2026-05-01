'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import UserTable from '@/components/admin/UserTable'
import LogsTable from '@/components/admin/LogsTable'

interface Stats {
  overview: {
    totalUsers: number; totalSessions: number; totalLLMCalls: number
    costToday: number; costMonth: number; costAllTime: number
  }
  topUsers: { email: string; totalCost: number; totalCalls: number }[]
}

type Section = 'stats' | 'users' | 'logs' | 'storage'

function formatCost(usd: number) {
  if (usd < 0.01) return `$${(usd * 100).toFixed(4)}¢`
  return `$${usd.toFixed(4)}`
}


export default function AdminPage() {
  const t = useTranslations('admin')
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)
  const [secret, setSecret] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''
  )
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [section, setSection] = useState<Section>('stats')
  const [storage, setStorage] = useState<{ fileCount: number; totalSizeBytes: number } | null>(null)
  const [storageLoading, setStorageLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (body?.data?.role !== 'admin') router.push('/') })
      .catch(() => router.push('/auth/login'))
      .finally(() => setAuthChecking(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stored = localStorage.getItem('ganus_dark')
    const dark = stored ? JSON.parse(stored) : false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('ganus_dark', JSON.stringify(next))
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  const fetchStats = useCallback(async (s?: string) => {
    const adminSecret = s ?? secret
    if (!adminSecret) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-secret': adminSecret } })
      if (!res.ok) { setError(t('invalidSecret')); sessionStorage.removeItem('admin_secret'); return }
      sessionStorage.setItem('admin_secret', adminSecret)
      const body = await res.json()
      setStats(body.data ?? body)
    } catch { setError(t('connectionError')) }
    finally { setLoading(false) }
  }, [secret, t])

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && !stats) fetchStats(saved)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadStorage = async () => {
    setStorageLoading(true)
    try {
      const res = await fetch('/api/admin/storage', { headers: { 'x-admin-secret': secret } })
      const body = await res.json()
      setStorage(body.data)
    } finally { setStorageLoading(false) }
  }

  if (authChecking) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <p className="text-text-muted text-sm">{t('loading')}</p>
    </div>
  )

  /* ── Login ── */
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <Card padding="p-8" className="w-full max-w-sm">
          <h1 className="text-2xl font-display font-bold mb-6 text-text-primary">{t('loginTitle')}</h1>
          {error && <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm mb-4">{error}</div>}
          <div className="mb-4">
            <Input type="password" placeholder={t('adminSecret')} value={secret} onChange={setSecret} />
          </div>
          <Button onClick={() => fetchStats()} disabled={loading || !secret} fullWidth variant="primary">
            {loading ? t('loading') : t('access')}
          </Button>
        </Card>
      </div>
    )
  }

  const NAV: { id: Section; icon: string; label: string }[] = [
    { id: 'stats',   icon: 'trendingUp', label: t('tabs.stats') },
    { id: 'users',   icon: 'users',      label: t('tabs.users') },
    { id: 'logs',    icon: 'zap',        label: t('tabs.logs') },
    { id: 'storage', icon: 'file',       label: t('tabs.storage') },
  ]

  const renderSidebar = (withClose = false) => (
    <div className="flex flex-col h-full bg-bg-card border-r border-border">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Link href="/">
        <Image src="/Logo-long-Ganus.png" alt="Ganus Admin" width={120} height={40} unoptimized
          style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        </Link>
        {withClose && (
          <button onClick={() => setMobileOpen(false)} className="text-text-muted p-1">
            <Icon name="x" size={18} color="currentColor" />
          </button>
        )}
      </div>
      <div className="px-4 py-2">
        <Badge color="gold" size="sm">Back-office</Badge>
      </div>
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5">
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => { setSection(id); setMobileOpen(false) }}
            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              section === id ? 'bg-border text-text-primary font-semibold' : 'text-text-secondary hover:bg-border hover:text-text-primary'
            }`}
          >
            <Icon name={icon} size={18} color="currentColor" />
            {label}
            {section === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />}
          </button>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-border flex flex-col gap-1">
        <button onClick={toggleDark} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-border transition-colors">
          <Icon name={isDark ? 'sun' : 'moon'} size={18} color="currentColor" />
          {isDark ? t('themeLight') : t('themeDark')}
        </button>
        <div className="px-1 py-1">
          <LanguageSwitcher collapsed={false} />
        </div>
        <Link href="/">
          <div className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-border transition-colors cursor-pointer">
            <Icon name="logout" size={18} color="currentColor" />
            {t('backToApp')}
          </div>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col">{renderSidebar()}</aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full z-50 w-56 md:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderSidebar(true)}
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-text-primary">
            <Icon name="menu" size={22} color="currentColor" />
          </button>
          <span className="text-sm font-semibold text-text-primary">{NAV.find((n) => n.id === section)?.label}</span>
          <div className="w-8" />
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto">

            {section === 'stats' && (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h1 className="text-2xl font-display font-bold text-text-primary">{t('dashboard')}</h1>
                  <Button onClick={() => fetchStats()} variant="outline" size="sm">{t('refresh')}</Button>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-6">
                  {[
                    { label: t('stats.totalUsers'),    value: stats.overview.totalUsers,               color: 'emerald' },
                    { label: t('stats.totalSessions'), value: stats.overview.totalSessions,            color: 'teal' },
                    { label: t('stats.totalMessages'), value: stats.overview.totalLLMCalls,            color: 'gold' },
                    { label: t('stats.costToday'),     value: formatCost(stats.overview.costToday),    color: 'orange' },
                    { label: t('stats.costMonth'),     value: formatCost(stats.overview.costMonth),    color: 'pink' },
                    { label: t('stats.costAllTime'),   value: formatCost(stats.overview.costAllTime),  color: 'black' },
                  ].map((item, i) => (
                    <Card key={i} padding="p-4">
                      <p className="text-xs text-text-secondary uppercase font-semibold mb-2">{item.label}</p>
                      <p className="text-xl font-bold" style={{ color: `var(--${item.color})` }}>{item.value}</p>
                    </Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <Card padding="p-5">
                    <h2 className="text-base font-semibold text-text-primary mb-3">{t('topUsers')}</h2>
                    {stats.topUsers.length === 0 ? (
                      <p className="text-text-muted text-sm">{t('noData')}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {stats.topUsers.map((u, i) => (
                          <div key={i} className="flex justify-between items-center p-2.5 bg-bg rounded-lg text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="text-text-primary font-medium overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</p>
                              <p className="text-text-muted text-xs">{u.totalCalls} {t('calls')}</p>
                            </div>
                            <p className="font-semibold text-gold font-mono ml-2">{formatCost(u.totalCost)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}

            {section === 'users' && (
              <>
                <h1 className="text-2xl font-display font-bold text-text-primary mb-5">{t('users.title')}</h1>
                <Card padding="p-5"><UserTable adminSecret={secret} /></Card>
              </>
            )}

            {section === 'logs' && (
              <>
                <h1 className="text-2xl font-display font-bold text-text-primary mb-5">{t('logs.title')}</h1>
                <Card padding="p-5"><LogsTable adminSecret={secret} /></Card>
              </>
            )}

            {section === 'storage' && (
              <>
                <h1 className="text-2xl font-display font-bold text-text-primary mb-5">{t('storage.title')}</h1>
                <Card padding="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-text-secondary">{t('storage.noData')}</p>
                    <Button variant="outline" size="sm" disabled={storageLoading} onClick={loadStorage}>
                      {storageLoading ? '...' : storage ? '↻' : 'Charger'}
                    </Button>
                  </div>
                  {storage && (
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
