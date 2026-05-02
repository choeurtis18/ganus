'use client'

import { useState, useEffect, FormEvent } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { signInAction } from './action'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { supabase } from '@/lib/supabase-client'

const featureIcons = [
  { icon: 'chat', key: 'interviews' },
  { icon: 'zap', key: 'cv' },
  { icon: 'users', key: 'advice' },
]

export default function LoginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    const msg = searchParams.get('message')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (msg) setMessage(decodeURIComponent(msg))

    const stored = localStorage.getItem("ganus_dark")
    let darkMode = false
    try {
      darkMode = stored ? JSON.parse(stored) : false
    } catch {
      darkMode = false
    }
    setIsDark(darkMode)
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError(t('errors.required'))
      return
    }

    setLoading(true)
    try {
      const result = await signInAction(email, password)
      if (result.error) {
        const errorMap: Record<string, string> = {
          'invalid_credentials': t('errors.invalidCredentials'),
          'signin_failed': t('errors.invalidCredentials'),
          'unknown': t('errors.unknown'),
        }
        setError(errorMap[result.error] || t('errors.unknown'))
        return
      }
      router.push('/dashboard')
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
    router.replace(pathname, { locale: newLocale })
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetMessage('')

    if (!resetEmail) {
      setResetError(t('errors.required'))
      return
    }

    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ganus.vercel.app'}/auth/reset-confirm`,
      })

      if (error) {
        setResetError(error.message)
      } else {
        setResetMessage(t('resetSent') || 'Email de réinitialisation envoyé')
        setResetEmail('')
      }
    } catch (err) {
      setResetError(t('errors.unknown'))
      console.error(err)
    } finally {
      setResetLoading(false)
    }
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

      {/* Left Panel */}
      <div className="hidden lg:flex w-2/4 bg-gradient-to-br from-[#0f172a] via-[#1a1f3a] to-[#2d1b69] flex-col gap-4 justify-center px-14 text-white">
        <div className="mb-4 mx-auto">
          <Link href="/" className="flex-shrink-0">
          <Image
            src="/Logo-long-Ganus.png"
            alt="Ganus"
            width={280}
            height={156}
            unoptimized
            style={{
              maxWidth: '280px',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Link>
        </div>

        <h1 className="font-display text-5xl font-bold mb-4 leading-tight">
          {t('heroTitle')}
        </h1>
        <p className="text-slate-300 mb-12 leading-relaxed">
          {t('heroSubtitle')}
        </p>

        <div className="flex flex-col gap-3">
          {featureIcons.map(({ icon, key }) => (
            <div key={key} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon name={icon} size={18} color="#d4af37" />
              </div>
              <span className="text-slate-200 text-sm">{t(`features.${key}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-10 py-10 bg-bg">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-4xl font-bold mb-2 text-text-primary">
            {t('title')} 👋
          </h2>
          <p className="text-text-secondary mb-8">
            {t('subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {message && (
              <div className="p-3 bg-emerald/10 text-emerald rounded-lg text-sm font-medium">
                {message}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <Input
              label={t('emailLabel')}
              type="email"
              icon=""
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={setEmail}
            />

            <div>
              <Input
                label={t('passwordLabel')}
                type="password"
                icon=""
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={setPassword}
              />
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-sm font-medium hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--gold)' }}
                >
                  {t('forgotPassword')}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} fullWidth variant="primary" size="lg">
              {loading ? t('submitting') : t('submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            {t('noAccount')}{' '}
            <Link
              href="/auth/signup"
              className="font-semibold text-emerald hover:opacity-80 transition-opacity"
            >
              {t('signup')}
            </Link>
          </p>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-lg shadow-lg max-w-sm w-full p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-display font-bold text-text-primary">
                {t('resetTitle') || 'Réinitialiser le mot de passe'}
              </h3>
              <button
                onClick={() => {
                  setShowReset(false)
                  setResetError('')
                  setResetMessage('')
                  setResetEmail('')
                }}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetMessage && (
                <div className="p-3 bg-emerald/10 text-emerald rounded-lg text-sm font-medium">
                  {resetMessage}
                </div>
              )}
              {resetError && (
                <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm font-medium">
                  {resetError}
                </div>
              )}

              <Input
                label={t('emailLabel')}
                type="email"
                placeholder={t('emailPlaceholder')}
                value={resetEmail}
                onChange={setResetEmail}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowReset(false)
                    setResetError('')
                    setResetMessage('')
                    setResetEmail('')
                  }}
                  fullWidth
                >
                  {t('cancel') || 'Annuler'}
                </Button>
                <Button type="submit" disabled={resetLoading} fullWidth>
                  {resetLoading ? t('sending') || 'Envoi...' : t('resetSend') || 'Envoyer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
