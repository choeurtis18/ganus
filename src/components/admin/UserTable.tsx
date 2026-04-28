'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AdminUser {
  id: string
  email: string
  role: string
  createdAt: string
  sessionCount: number
  totalCost: number
}

interface UserDetail {
  user: { id: string; email: string; role: string; createdAt: string }
  stats: {
    sessionCount: number
    totalCost: number
    costByFeature: { feature: string; cost: number; calls: number }[]
  }
  recentLogs: {
    id: string
    model: string
    feature: string
    inputTokens: number
    outputTokens: number
    costUSD: number
    createdAt: string
  }[]
}

interface UserTableProps {
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

export default function UserTable({ adminSecret }: UserTableProps) {
  const t = useTranslations('admin')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')

  const fetchUsers = async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?page=${p}`, {
        headers: { 'x-admin-secret': adminSecret },
      })
      const body = await res.json()
      setUsers(body.data.users)
      setTotal(body.data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setSelectedUser(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        headers: { 'x-admin-secret': adminSecret },
      })
      const body = await res.json()
      setSelectedUser(body.data)
    } finally {
      setDetailLoading(false)
    }
  }

  const changeRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': adminSecret, 'content-type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    fetchUsers(page)
  }

  const deleteUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': adminSecret },
    })
    setConfirmDelete(null)
    if (selectedUser?.user.id === id) setSelectedUser(null)
    fetchUsers(page)
  }

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* User list */}
      <div className="flex-1 min-w-0">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            placeholder="Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
          />
          <div className="flex gap-1">
            {(['all', 'user', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  roleFilter === r ? 'bg-navy text-white' : 'bg-bg border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {r === 'all' ? 'Tous' : r === 'admin' ? 'Admin' : 'Users'}
              </button>
            ))}
          </div>
          <Button onClick={() => fetchUsers(page)} variant="outline" size="sm">↻</Button>
        </div>

        <p className="text-text-muted text-xs mb-2">{filtered.length} / {total} utilisateurs</p>

        {loading ? (
          <p className="text-text-muted text-sm py-4 text-center">{t('loading')}</p>
        ) : users.length === 0 ? (
          <p className="text-text-muted text-sm">{t('users.noUsers')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.length === 0 && (
              <p className="text-text-muted text-sm py-4 text-center">Aucun résultat</p>
            )}
            {filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => openDetail(u.id)}
                className={`flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer transition-colors flex-wrap ${
                  selectedUser?.user.id === u.id
                    ? 'bg-navy/10 border border-navy/30'
                    : 'bg-bg hover:bg-border'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {u.email}
                  </p>
                  <p className="text-text-muted text-xs">
                    {u.sessionCount} sessions · {formatCost(u.totalCost)} · {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Badge color={u.role === 'admin' ? 'gold' : 'navy'} size="sm">
                  {t(`users.roles.${u.role}`)}
                </Badge>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => changeRole(u.id, u.role)}>
                    {t('users.changeRole')}
                  </Button>
                  {confirmDelete === u.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="danger" onClick={() => deleteUser(u.id)}>✓</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>✕</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(u.id)}>
                      {t('users.delete')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchUsers(page - 1)}>←</Button>
            <span className="text-text-secondary text-sm self-center">{page} / {Math.ceil(total / 20)}</span>
            <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => fetchUsers(page + 1)}>→</Button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {(selectedUser || detailLoading) && (
        <div className="lg:w-80 xl:w-96 flex-shrink-0 border border-border rounded-xl p-4 bg-bg-card flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-text-primary text-sm">Détail utilisateur</h3>
            <button onClick={() => setSelectedUser(null)} className="text-text-muted hover:text-text-primary text-lg leading-none">✕</button>
          </div>

          {detailLoading ? (
            <p className="text-text-muted text-sm text-center py-4">{t('loading')}</p>
          ) : selectedUser && (
            <>
              <div>
                <p className="text-text-primary font-medium text-sm truncate">{selectedUser.user.email}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  Membre depuis {new Date(selectedUser.user.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg rounded-lg p-3">
                  <p className="text-text-muted text-xs mb-1">Sessions</p>
                  <p className="font-bold text-text-primary">{selectedUser.stats.sessionCount}</p>
                </div>
                <div className="bg-bg rounded-lg p-3">
                  <p className="text-text-muted text-xs mb-1">Coût total</p>
                  <p className="font-bold text-gold font-mono">{formatCost(selectedUser.stats.totalCost)}</p>
                </div>
              </div>

              {/* Cost by feature */}
              <div>
                <p className="text-text-secondary text-xs font-semibold uppercase mb-2">Coûts par fonctionnalité</p>
                {selectedUser.stats.costByFeature.length === 0 ? (
                  <p className="text-text-muted text-xs">Aucune dépense</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedUser.stats.costByFeature
                      .sort((a, b) => b.cost - a.cost)
                      .map((f) => {
                        const feat = FEATURE_LABELS[f.feature] ?? { label: f.feature, color: 'navy' as const }
                        const pct = selectedUser.stats.totalCost > 0
                          ? Math.round((f.cost / selectedUser.stats.totalCost) * 100)
                          : 0
                        return (
                          <div key={f.feature} className="flex items-center gap-2">
                            <Badge color={feat.color} size="sm">{feat.label}</Badge>
                            <div className="flex-1 bg-bg rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: `var(--${feat.color})` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted font-mono whitespace-nowrap">{formatCost(f.cost)}</span>
                            <span className="text-xs text-text-muted">({f.calls})</span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* Recent logs */}
              <div>
                <p className="text-text-secondary text-xs font-semibold uppercase mb-2">Logs récents</p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {selectedUser.recentLogs.map((log) => {
                    const feat = FEATURE_LABELS[log.feature] ?? { label: log.feature, color: 'navy' as const }
                    return (
                      <div key={log.id} className="flex items-center justify-between p-2 bg-bg rounded text-xs gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge color={feat.color} size="sm">{feat.label}</Badge>
                          <span className="text-text-muted truncate">{log.model}</span>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-text-muted">{log.inputTokens + log.outputTokens}t</span>
                          <span className="font-mono text-emerald">{formatCost(log.costUSD)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
