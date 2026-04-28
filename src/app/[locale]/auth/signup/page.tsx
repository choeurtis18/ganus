'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { signUpAction } from './action'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const featureIcons = [
  { icon: 'check', key: 'free' },
  { icon: 'zap', key: 'access' },
  { icon: 'award', key: 'noCard' },
]

export default function SignupPage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('auth.signup')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('genus_dark')
    const darkMode = stored ? JSON.parse(stored) : false
    setIsDark(darkMode)
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !confirmPassword) {
      setError(t('errors.required'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('errors.passwordTooShort'))
      return
    }

    setLoading(true)
    try {
      const result = await signUpAction(email, password)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(`/auth/login?message=${encodeURIComponent(t('successMessage'))}`)
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
    localStorage.setItem('genus_dark', JSON.stringify(newDark))
    document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light')
  }

  const toggleLanguage = () => {
    const newLocale = locale === 'fr' ? 'en' : 'fr'
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex h-screen overflow-hidden">
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
      <div className="hidden lg:flex w-2/5 bg-gradient-to-br from-[#0f172a] via-[#1a1f3a] to-[#2d1b69] flex-col justify-center px-14 text-white">
        <div className="mb-4 mx-auto">
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
            {t('title')}
          </h2>
          <p className="text-text-secondary mb-8">
            {t('subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <Input
              label={t('emailLabel')}
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={setEmail}
            />

            <Input
              label={t('passwordLabel')}
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={setPassword}
              hint={t('passwordHint')}
            />

            <Input
              label={t('passwordConfirmLabel')}
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={confirmPassword}
              onChange={setConfirmPassword}
            />

            <Button type="submit" disabled={loading} fullWidth variant="primary" size="lg">
              {loading ? t('submitting') : t('submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            {t('hasAccount')}{' '}
            <Link
              href="/auth/login"
              className="font-semibold text-emerald hover:opacity-80 transition-opacity"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
