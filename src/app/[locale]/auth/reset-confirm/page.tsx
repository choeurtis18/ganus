'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter as useI18nRouter, usePathname } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { supabase } from '@/lib/supabase-client'

export default function ResetConfirmPage() {
  const i18nRouter = useI18nRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('auth.reset')
  const tCommon = useTranslations('common')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('ganus_dark')
    let darkMode = false
    try {
      darkMode = stored ? JSON.parse(stored) : false
    } catch {
      darkMode = false
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(darkMode)
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError(t('errors.required'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch') || 'Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setError(t('errors.passwordTooShort') || 'Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        // Map Supabase errors to translations
        const errorMap: Record<string, string> = {
          'invalid_password': t('errors.passwordTooShort'),
          'same_password': 'Le nouveau mot de passe doit être différent de l\'ancien',
        }
        const translatedError = errorMap[updateError.message] || t('errors.unknown')
        setError(translatedError)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        i18nRouter.push('/auth/login')
      }, 2000)
    } catch (err) {
      setError(t('errors.unknown'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('ganus_dark', JSON.stringify(newDark))
    document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light')
  }

  const toggleLanguage = () => {
    const newLocale = locale === 'fr' ? 'en' : 'fr'
    i18nRouter.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Back to home */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="font-display font-bold text-lg text-text-primary hover:text-navy transition-colors">
          Ganus
        </Link>
      </div>

      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex gap-3 z-10">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-bg-card border border-border-color hover:border-text-secondary transition-colors"
          title={tCommon('toggleTheme')}
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={20} color="var(--text-secondary)" />
        </button>
        <button
          onClick={toggleLanguage}
          className="px-3 py-2 rounded-lg bg-bg-card border border-border-color hover:border-text-secondary transition-colors text-sm font-semibold text-text-primary"
        >
          {locale === 'fr' ? 'EN' : 'FR'}
        </button>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-10 py-10 bg-bg">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <Link href="/" className="flex-shrink-0 inline-block">
              <Image
                src="/Logo-Ganus.png"
                alt="Ganus"
                width={80}
                height={80}
              />
            </Link>
          </div>

          <h2 className="font-display text-4xl font-bold mb-2 text-text-primary text-center">
            {t('title') || 'Nouveau mot de passe'}
          </h2>
          <p className="text-text-secondary mb-8 text-center">
            {t('subtitle') || 'Définissez un nouveau mot de passe pour votre compte'}
          </p>

          {success ? (
            <div className="p-4 bg-emerald/10 text-emerald rounded-lg text-center">
              <p className="font-medium mb-2">{t('success') || 'Mot de passe réinitialisé avec succès!'}</p>
              <p className="text-sm">{t('redirecting') || 'Redirection vers la connexion...'}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <Input
                label={t('passwordLabel') || 'Nouveau mot de passe'}
                type="password"
                placeholder={t('passwordPlaceholder') || '••••••••'}
                value={password}
                onChange={setPassword}
                hint={t('passwordHint') || 'Au minimum 8 caractères'}
              />

              <Input
                label={t('passwordConfirmLabel') || 'Confirmer le mot de passe'}
                type="password"
                placeholder={t('passwordPlaceholder') || '••••••••'}
                value={confirmPassword}
                onChange={setConfirmPassword}
              />

              <Button type="submit" disabled={loading} fullWidth variant="primary" size="lg">
                {loading ? t('submitting') || 'Envoi...' : t('submit') || 'Réinitialiser'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-text-secondary">
            <Link
              href="/auth/login"
              className="font-semibold text-emerald hover:opacity-80 transition-opacity"
            >
              {t('backToLogin') || 'Retour à la connexion'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
