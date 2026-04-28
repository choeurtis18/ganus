'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { signOut } from '@/lib/supabase-client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const router = useRouter()
  const t = useTranslations('profile')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) throw new Error(t('errors.loadProfileFailed'))
        const body = await res.json()
        const data = body.data
        setEmail(data.email)
        setCreatedAt(new Date(data.createdAt).toLocaleDateString())
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.loadProfile'))
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [t])

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setSuccess('')

    if (!currentPassword) {
      setPasswordError(t('errors.currentPasswordRequired'))
      return
    }

    if (!password || password.length < 8) {
      setPasswordError(t('errors.passwordValidation'))
      return
    }

    if (password !== passwordConfirm) {
      setPasswordError(t('errors.passwordMismatch'))
      return
    }

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

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || t('errors.updateFailed'))
      }

      setCurrentPassword('')
      setPassword('')
      setPasswordConfirm('')
      setShowPasswordModal(false)
      setSuccess(t('passwordSuccess'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('errors.updateFailed'))
      setShowPasswordModal(false)
    } finally {
      setPasswordLoading(false)
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
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.exportFailed'))
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/profile/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || t('errors.deleteFailed'))
      }

      await signOut()
      setTimeout(() => {
        router.push('/auth/login')
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.deleteFailed'))
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <p>{t('title')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-display font-bold text-text-primary">
        {t('title')}
      </h1>

      {error && (
        <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald/10 text-emerald rounded-lg text-sm font-medium">
          {success}
        </div>
      )}

      {/* Account Info */}
      <Card padding="p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {t('accountInfo')}
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">
              {t('email')}
            </p>
            <p className="text-text-primary font-medium">{email}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">
              {t('memberSince')}
            </p>
            <p className="text-text-primary">{createdAt}</p>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card padding="p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {t('changePassword')}
        </h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            type="password"
            placeholder={t('currentPassword')}
            value={currentPassword}
            onChange={setCurrentPassword}
            error={passwordError}
          />
          <Input
            type="password"
            placeholder={`${t('newPassword')} (${t('passwordMinLength')})`}
            value={password}
            onChange={setPassword}
            error={passwordError}
          />
          <Input
            type="password"
            placeholder={t('confirmPassword')}
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            error={passwordError}
          />
          <Button
            type="submit"
            disabled={passwordLoading || !currentPassword || !password || !passwordConfirm}
            variant="primary"
            fullWidth
          >
            {passwordLoading ? t('updatingPassword') : t('updatePassword')}
          </Button>
        </form>
      </Card>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-card rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 border border-border-color">
            <h2 className="text-lg font-semibold text-text-primary mb-0">
              {t('confirmPasswordChange')}
            </h2>
            <p className="text-sm text-text-secondary mt-3 mb-6">
              {t('confirmPasswordDescription')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowPasswordModal(false)}
                disabled={passwordLoading}
                variant="outline"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleConfirmPasswordChange}
                disabled={passwordLoading}
                variant="primary"
              >
                {passwordLoading ? t('updatingPassword') : t('confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Data */}
      <Card padding="p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {t('exportData')}
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          {t('exportDescription')}
        </p>
        <Button onClick={handleExport} variant="primary">
          {t('download')}
        </Button>
      </Card>

      {/* Delete Account */}
      <Card padding="p-5" style={{ borderLeft: '4px solid #ef4444' }}>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              {t('deleteAccount')}
            </h2>
            <p className="text-sm text-text-secondary mt-0">
              {t('deleteDescription')}
            </p>
          </div>

          {!deleteConfirm ? (
            <Button onClick={() => setDeleteConfirm(true)} variant="danger" fullWidth>
              {t('deleteButton')}
            </Button>
          ) : (
            <div className="flex flex-col gap-4 p-3 bg-red-600/5 rounded-lg border border-red-600/20">
              <p className="text-xs font-semibold text-red-600 mb-0">
                {t('deleteConfirm')}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleteLoading}
                  variant="outline"
                  fullWidth
                >
                  {t('cancel')}
                </Button>
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
