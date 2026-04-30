'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AdminUser {
  id: string; email: string; role: string; createdAt: string; sessionCount: number; totalCost: number
}

interface UserDetail {
  user: {
    id: string; email: string; role: string; createdAt: string
    suspended: boolean; postesRecherches: string[] | null
    cvAnalysisCount: number; cvAnalysisAt: string | null
    chatReportCount: number
  }
  stats: { sessionCount: number; totalCost: number; costByFeature: { feature: string; cost: number; calls: number }[] }
  recentLogs: { id: string; model: string; feature: string; inputTokens: number; outputTokens: number; costUSD: number; createdAt: string }[]
  recentSessions: { id: string; title: string; createdAt: string; totalTurns: number; averageScore: number | null }[]
}

interface UserTableProps { adminSecret: string }

function formatCost(usd: number) { return usd < 0.01 ? `$${(usd * 100).toFixed(4)}¢` : `$${usd.toFixed(4)}` }

const FEATURE_LABELS: Record<string, { label: string; color: 'teal' | 'gold' | 'emerald' | 'navy' }> = {
  chat_turn:     { label: 'Chat',     color: 'teal' },
  chat_feedback: { label: 'Feedback', color: 'gold' },
  cv_analysis:   { label: 'CV',       color: 'emerald' },
}

export default function UserTable({ adminSecret }: UserTableProps) {
  const t = useTranslations('admin')
  const [users, setUsers]               = useState<AdminUser[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch]             = useState('')
  const [roleFilter, setRoleFilter]     = useState<'all' | 'user' | 'admin'>('all')
  const [editingPostes, setEditingPostes] = useState<string[] | null>(null)
  const [postesInput, setPostesInput]   = useState('')
  const [saving, setSaving]             = useState(false)

  const fetchUsers = async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?page=${p}`, { headers: { 'x-admin-secret': adminSecret } })
      const body = await res.json()
      setUsers(body.data.users); setTotal(body.data.total); setPage(p)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (id: string) => {
    if (selectedId === id) { setSelectedId(null); setSelectedUser(null); return }
    setSelectedId(id); setDetailLoading(true); setSelectedUser(null); setEditingPostes(null); setPostesInput('')
    try {
      const res = await fetch(`/api/admin/users/${id}`, { headers: { 'x-admin-secret': adminSecret } })
      const body = await res.json(); setSelectedUser(body.data)
    } finally { setDetailLoading(false) }
  }

  const patch = (id: string, data: Record<string, unknown>) =>
    fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': adminSecret, 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })

  const changeRole = async (id: string, role: string) => {
    await patch(id, { role: role === 'admin' ? 'user' : 'admin' })
    fetchUsers(page)
  }

  const deleteUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': adminSecret } })
    setConfirmDelete(null)
    if (selectedId === id) { setSelectedId(null); setSelectedUser(null) }
    fetchUsers(page)
  }

  const toggleSuspend = async () => {
    if (!selectedId) return
    await patch(selectedId, { suspended: !selectedUser?.user.suspended })
    setSelectedId(null); void openDetail(selectedId)
  }

  const resetRateLimit = async () => {
    if (!selectedId) return
    await patch(selectedId, { resetCvRateLimit: true })
    void openDetail(selectedId)
  }

  const resetChatReportRateLimit = async () => {
    if (!selectedId) return
    await patch(selectedId, { resetChatReportRateLimit: true })
    void openDetail(selectedId)
  }

  const savePostes = async () => {
    if (!selectedId || !editingPostes) return
    setSaving(true)
    await patch(selectedId, { postesRecherches: editingPostes })
    setSaving(false); setEditingPostes(null)
    setSelectedId(null); void openDetail(selectedId)
  }

  const addPoste = () => {
    if (!editingPostes || !postesInput.trim() || editingPostes.length >= 5) return
    setEditingPostes([...editingPostes, postesInput.trim()]); setPostesInput('')
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) && (roleFilter === 'all' || u.role === roleFilter)
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text" placeholder="Rechercher par email..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
        />
        <div className="flex gap-1">
          {(['all', 'user', 'admin'] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
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
          {filtered.length === 0 && <p className="text-text-muted text-sm py-4 text-center">Aucun résultat</p>}
          {filtered.map((u) => (
            <div key={u.id} className="flex flex-col">
              <div
                onClick={() => openDetail(u.id)}
                className={`flex items-center gap-3 p-3 text-sm cursor-pointer transition-colors flex-wrap ${
                  selectedId === u.id ? 'bg-navy/10 border border-navy/30 rounded-t-lg border-b-0' : 'bg-bg hover:bg-border rounded-lg'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</p>
                  <p className="text-text-muted text-xs">{u.sessionCount} sessions · {formatCost(u.totalCost)} · {new Date(u.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <Badge color={u.role === 'admin' ? 'gold' : 'navy'} size="sm">{t(`users.roles.${u.role}`)}</Badge>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => changeRole(u.id, u.role)}>{t('users.changeRole')}</Button>
                  {confirmDelete === u.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="danger" onClick={() => deleteUser(u.id)}>✓</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>✕</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(u.id)}>{t('users.delete')}</Button>
                  )}
                </div>
              </div>

              {selectedId === u.id && (
                <div className="border border-navy/30 border-t-0 rounded-b-lg bg-navy/5 p-4 flex flex-col gap-4">
                  {detailLoading ? (
                    <p className="text-text-muted text-sm text-center py-2">{t('loading')}</p>
                  ) : !selectedUser ? (
                    <p className="text-text-muted text-sm text-center py-2">Erreur de chargement</p>
                  ) : (
                    <>
                      {/* Stats cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { label: 'Sessions',       value: String(selectedUser.stats.sessionCount), color: '' },
                          { label: 'Coût total',     value: formatCost(selectedUser.stats.totalCost), color: 'text-gold font-mono' },
                          { label: 'Analyses CV',    value: `${selectedUser.user.cvAnalysisCount}/2 jour`, color: '' },
                          { label: 'Rapports chat',  value: `${selectedUser.user.chatReportCount}/4 jour`, color: '' },
                          { label: 'Statut',         value: null, badge: selectedUser.user.suspended },
                        ].map((item, i) => (
                          <div key={i} className="bg-bg-card rounded-lg p-3">
                            <p className="text-text-muted text-xs mb-1">{item.label}</p>
                            {item.value !== null
                              ? <p className={`font-bold text-text-primary ${item.color}`}>{item.value}</p>
                              : <Badge color={selectedUser.user.suspended ? 'orange' : 'emerald'} size="sm">
                                  {selectedUser.user.suspended ? 'Suspendu' : 'Actif'}
                                </Badge>
                            }
                          </div>
                        ))}
                      </div>

                      {/* Admin actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={selectedUser.user.suspended ? 'ghost' : 'danger'} onClick={toggleSuspend}>
                          {selectedUser.user.suspended ? '✓ Réactiver' : '⊘ Suspendre'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetRateLimit}>↺ Reset analyse CV</Button>
                        <Button size="sm" variant="outline" onClick={resetChatReportRateLimit}>↺ Reset rapports chat</Button>
                      </div>

                      {/* Postes recherchés */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-text-secondary text-xs font-semibold uppercase">Postes recherchés</p>
                          {editingPostes === null
                            ? <button className="text-xs text-navy underline" onClick={() => setEditingPostes(selectedUser.user.postesRecherches ?? [])}>Modifier</button>
                            : <div className="flex gap-1">
                                <Button size="sm" variant="primary" disabled={saving} onClick={savePostes}>Sauver</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingPostes(null); setPostesInput('') }}>Annuler</Button>
                              </div>
                          }
                        </div>
                        {editingPostes !== null ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1">
                              {editingPostes.map((p, i) => (
                                <span key={i} className="flex items-center gap-1 bg-bg border border-border rounded px-2 py-0.5 text-xs text-text-primary">
                                  {p}
                                  <button className="text-text-muted hover:text-orange ml-1" onClick={() => setEditingPostes(editingPostes.filter((_, j) => j !== i))}>×</button>
                                </span>
                              ))}
                            </div>
                            {editingPostes.length < 5 && (
                              <div className="flex gap-2">
                                <input
                                  type="text" placeholder="Ajouter un poste..." value={postesInput}
                                  onChange={(e) => setPostesInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') addPoste() }}
                                  className="flex-1 px-2 py-1 text-xs bg-bg border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-gold"
                                />
                                <button onClick={addPoste} className="text-xs px-2 py-1 bg-navy/10 text-navy rounded hover:bg-navy/20 transition-colors">+</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(selectedUser.user.postesRecherches ?? []).length === 0
                              ? <p className="text-text-muted text-xs">Aucun poste défini</p>
                              : (selectedUser.user.postesRecherches ?? []).map((p, i) => <Badge key={i} color="navy" size="sm">{p}</Badge>)
                            }
                          </div>
                        )}
                      </div>

                      {/* Cost by feature */}
                      <div>
                        <p className="text-text-secondary text-xs font-semibold uppercase mb-2">Coûts par fonctionnalité</p>
                        {selectedUser.stats.costByFeature.length === 0 ? (
                          <p className="text-text-muted text-xs">Aucune dépense</p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {selectedUser.stats.costByFeature.sort((a, b) => b.cost - a.cost).map((f) => {
                              const feat = FEATURE_LABELS[f.feature] ?? { label: f.feature, color: 'navy' as const }
                              const pct = selectedUser.stats.totalCost > 0 ? Math.round((f.cost / selectedUser.stats.totalCost) * 100) : 0
                              return (
                                <div key={f.feature} className="flex items-center gap-2">
                                  <Badge color={feat.color} size="sm">{feat.label}</Badge>
                                  <div className="flex-1 bg-bg rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--${feat.color})` }} />
                                  </div>
                                  <span className="text-xs text-text-muted font-mono whitespace-nowrap">{formatCost(f.cost)}</span>
                                  <span className="text-xs text-text-muted">({f.calls})</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Recent sessions */}
                      {(selectedUser.recentSessions ?? []).length > 0 && (
                        <div>
                          <p className="text-text-secondary text-xs font-semibold uppercase mb-2">Sessions récentes</p>
                          <div className="flex flex-col gap-1">
                            {selectedUser.recentSessions.map((s) => (
                              <div key={s.id} className="flex items-center justify-between p-2 bg-bg rounded text-xs">
                                <p className="text-text-primary truncate flex-1">{s.title}</p>
                                <div className="flex items-center gap-2 ml-2 whitespace-nowrap">
                                  <span className="text-text-muted">{s.totalTurns} tours</span>
                                  {s.averageScore != null && <span className="font-mono text-emerald">{Math.round(s.averageScore)}/100</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent logs */}
                      <div>
                        <p className="text-text-secondary text-xs font-semibold uppercase mb-2">Logs récents</p>
                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
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
          ))}
        </div>
      )}
    </div>
  )
}
