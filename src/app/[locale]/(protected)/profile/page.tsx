'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { signOut } from '@/lib/supabase-client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import { useToast } from '@/components/ui/toast'
import type { CvAnalysis } from '@/lib/llm-cv'

interface ProfileData {
  email: string
  createdAt: string
  nom: string
  prenom: string
  age: string
  domaine: string
  sousDomaine: string
  niveau: string
  postesRecherches: string[]
  cvUrl: string | null
  cvAnalysis: CvAnalysis | null
  cvAnalysisAt: string | null
  cvAnalysisCount: number
}

export default function ProfilePage() {
  const t = useTranslations('profile')
  const toast = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const [cvAnalysis, setCvAnalysis] = useState<CvAnalysis | null>(null)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [cvAnalysisAt, setCvAnalysisAt] = useState<string | null>(null)
  const [cvDownloading, setCvDownloading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (!body?.data) return
        const d = body.data
        setProfile({
          email: d.email,
          createdAt: new Date(d.createdAt).toLocaleDateString(),
          nom: d.nom ?? '',
          prenom: d.prenom ?? '',
          age: d.age ? String(d.age) : '',
          domaine: d.domaine ?? '',
          sousDomaine: d.sousDomaine ?? '',
          niveau: d.niveau ?? '',
          postesRecherches: Array.isArray(d.postesRecherches) ? d.postesRecherches : [],
          cvUrl: d.cvUrl ?? null,
          cvAnalysis: d.cvAnalysis ?? null,
          cvAnalysisAt: d.cvAnalysisAt ?? null,
          cvAnalysisCount: d.cvAnalysisCount ?? 0,
        })
        if (d.cvAnalysis) setCvAnalysis(d.cvAnalysis as CvAnalysis)
        if (d.cvUrl) setCvUrl(d.cvUrl)
        if (d.cvAnalysisAt) setCvAnalysisAt(d.cvAnalysisAt)
      })
      .catch(() => toast(t('errors.loadProfileFailed'), 'error'))
      .finally(() => setLoading(false))
  }, [t, toast])

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (!currentPassword) { setPasswordError(t('errors.currentPasswordRequired')); return }
    if (!password || password.length < 8) { setPasswordError(t('errors.passwordValidation')); return }
    if (password !== passwordConfirm) { setPasswordError(t('errors.passwordMismatch')); return }
    setShowPasswordModal(true)
  }

  const handleConfirmPasswordChange = async () => {
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password }),
      })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error || t('errors.updateFailed')) }
      setCurrentPassword(''); setPassword(''); setPasswordConfirm('')
      setShowPasswordModal(false)
      toast(t('passwordSuccess'), 'success')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('errors.updateFailed'))
      setShowPasswordModal(false)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleCvDownload = async () => {
    setCvDownloading(true)
    try {
      const res = await fetch('/api/profile/cv')
      if (!res.ok) throw new Error()
      const body = await res.json()
      window.open(body.data.url, '_blank')
    } catch {
      toast(t('errors.exportFailed'), 'error')
    } finally {
      setCvDownloading(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/profile/export')
      if (!res.ok) throw new Error(t('errors.exportFailed'))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ganus-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link); link.click()
      document.body.removeChild(link); URL.revokeObjectURL(url)
    } catch { toast(t('errors.exportFailed'), 'error') }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/profile/delete', { method: 'POST' })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error || t('errors.deleteFailed')) }
      await signOut()
      setTimeout(() => { window.location.href = "/auth/login" }, 500)
    } catch (err) {
      toast(err instanceof Error ? err.message : t('errors.deleteFailed'), 'error')
      setDeleteLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary"><p>{t('title')}</p></div>

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-display font-bold text-text-primary">{t('title')}</h1>

      {/* Account Info */}
      <Card padding="p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('accountInfo')}</h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">{t('email')}</p>
            <p className="text-text-primary font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">{t('memberSince')}</p>
            <p className="text-text-primary">{profile?.createdAt}</p>
          </div>
        </div>
      </Card>

      {/* Professional Profile */}
      {profile && (
        <ProfileForm
          initial={{
            nom: profile.nom, prenom: profile.prenom, age: profile.age,
            domaine: profile.domaine, sousDomaine: profile.sousDomaine,
            niveau: profile.niveau, postesRecherches: profile.postesRecherches,
          }}
        />
      )}

      {/* CV — score résumé */}
      {cvAnalysis && (
        <Card padding="p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-text-primary">{t('cv.title')}</h2>
            {cvUrl && (
              <Button variant="outline" size="sm" disabled={cvDownloading} onClick={handleCvDownload} icon="download">
                {cvDownloading ? '...' : t('cv.download')}
              </Button>
            )}
          </div>
          {cvAnalysisAt && (
            <p className="text-xs text-text-muted mb-3">
              {t('cv.lastAnalysis')} {new Date(cvAnalysisAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-text-secondary">{t('cv.score')}</p>
            <p className={`text-2xl font-bold font-display ${cvAnalysis.score >= 80 ? 'text-emerald' : cvAnalysis.score >= 60 ? 'text-gold' : 'text-orange'}`}>
              {cvAnalysis.score}<span className="text-sm font-normal text-text-muted">/100</span>
            </p>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full ${cvAnalysis.score >= 80 ? 'bg-emerald' : cvAnalysis.score >= 60 ? 'bg-gold' : 'bg-orange'}`}
              style={{ width: `${cvAnalysis.score}%` }}
            />
          </div>
          <Link href="/cv">
            <p className="text-sm text-gold hover:underline cursor-pointer">{t('cv.seeAnalysis')} →</p>
          </Link>
        </Card>
      )}

      {/* Change Password */}
      <Card padding="p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('changePassword')}</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input type="password" placeholder={t('currentPassword')} value={currentPassword} onChange={setCurrentPassword} error={passwordError} />
          <Input type="password" placeholder={`${t('newPassword')} (${t('passwordMinLength')})`} value={password} onChange={setPassword} />
          <Input type="password" placeholder={t('confirmPassword')} value={passwordConfirm} onChange={setPasswordConfirm} />
          <Button type="submit" disabled={passwordLoading || !currentPassword || !password || !passwordConfirm} variant="primary" fullWidth>
            {passwordLoading ? t('updatingPassword') : t('updatePassword')}
          </Button>
        </form>
      </Card>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-card rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 border border-border-color">
            <h2 className="text-lg font-semibold text-text-primary mb-0">{t('confirmPasswordChange')}</h2>
            <p className="text-sm text-text-secondary mt-3 mb-6">{t('confirmPasswordDescription')}</p>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => setShowPasswordModal(false)} disabled={passwordLoading} variant="outline">{t('cancel')}</Button>
              <Button onClick={handleConfirmPasswordChange} disabled={passwordLoading} variant="primary">
                {passwordLoading ? t('updatingPassword') : t('confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Data */}
      <Card padding="p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('exportData')}</h2>
        <p className="text-sm text-text-secondary mb-4">{t('exportDescription')}</p>
        <Button onClick={handleExport} variant="primary">{t('download')}</Button>
      </Card>

      {/* Delete Account */}
      <Card padding="p-5" style={{ borderLeft: '4px solid #ef4444' }}>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">{t('deleteAccount')}</h2>
            <p className="text-sm text-text-secondary mt-0">{t('deleteDescription')}</p>
          </div>
          {!deleteConfirm ? (
            <Button onClick={() => setDeleteConfirm(true)} variant="danger" fullWidth>{t('deleteButton')}</Button>
          ) : (
            <div className="flex flex-col gap-4 p-3 bg-red-600/5 rounded-lg border border-red-600/20">
              <p className="text-xs font-semibold text-red-600">{t('deleteConfirm')}</p>
              <div className="flex gap-3">
                <Button onClick={() => setDeleteConfirm(false)} disabled={deleteLoading} variant="outline" fullWidth>{t('cancel')}</Button>
                <Button onClick={handleDelete} disabled={deleteLoading} variant="danger" fullWidth>
                  {deleteLoading ? t('deleting') : t('confirmDelete')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
