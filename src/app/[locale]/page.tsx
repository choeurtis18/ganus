'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname, Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Avatar } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase-client'

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <Card padding="p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--navy) 10%, transparent)' }}>
          <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={22} color="var(--navy)" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
          <p className="text-sm text-text-secondary">{desc}</p>
        </div>
      </div>
    </Card>
  )
}

export default function LandingPage() {
  const t = useTranslations('landing')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [isDark, setIsDark] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('ganus_dark')
    const dark = stored ? JSON.parse(stored) : false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('ganus_dark', JSON.stringify(next))
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  const toggleLanguage = () => {
    router.replace(pathname, { locale: locale === 'fr' ? 'en' : 'fr' })
  }

  const features = [
    { icon: 'chat', key: 'chat' },
    { icon: 'zap', key: 'feedback' },
    { icon: 'trendingUp', key: 'dashboard' },
    { icon: 'file', key: 'cv' },
  ] as const

  const steps = [
    { key: 'step1', color: 'var(--emerald)' },
    { key: 'step2', color: 'var(--gold)' },
    { key: 'step3', color: 'var(--teal)' },
  ] as const

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg flex justify-between items-center px-3 sm:px-6 py-4 max-w-5xl mx-auto border-b border-border-color">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/Logo-long-Ganus.png"
            alt="Ganus"
            width={120}
            height={67}
            unoptimized
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-bg-card border border-border-color hover:border-text-secondary transition-colors flex-shrink-0"
            title={tCommon('toggleTheme')}
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={16} color="var(--text-secondary)" />
          </button>
          <button
            onClick={toggleLanguage}
            className="px-2 sm:px-3 py-2 rounded-lg bg-bg-card border border-border-color hover:border-text-secondary transition-colors text-xs sm:text-sm font-semibold text-text-primary flex-shrink-0"
          >
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>
          {userEmail ? (
            <Link href="/dashboard" className="flex items-center gap-2 pl-1">
              <Avatar name={userEmail} size="sm" />
              <span className="hidden sm:inline text-sm font-medium text-text-primary">
                {t('header.myAccount')}
              </span>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">{t('header.login')}</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary" size="sm">{t('hero.cta')}</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'color-mix(in srgb, var(--emerald) 10%, transparent)', color: 'var(--emerald)' }}>
          <Icon name="sparkles" size={14} color="var(--emerald)" />
          {t('hero.badge')}
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-bold text-text-primary leading-tight mb-6">
          {t('hero.title')}
        </h1>

        <p className="text-lg text-text-secondary mb-10 max-w-xl mx-auto">
          {t('hero.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signup">
            <Button variant="gold" size="lg" icon="sparkles">{t('cta.button')}</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" size="lg">{t('hero.login')}</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-display font-bold text-text-primary text-center mb-10">
          {t('features.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <FeatureCard
              key={f.key}
              icon={f.icon}
              title={t(`features.${f.key}.title`)}
              desc={t(`features.${f.key}.desc`)}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-display font-bold text-text-primary text-center mb-12">
          {t('howItWorks.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: `color-mix(in srgb, ${step.color} 15%, transparent)` }}>
                <span className="text-xl font-bold font-display" style={{ color: step.color }}>
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{t(`howItWorks.${step.key}.title`)}</h3>
              <p className="text-sm text-text-secondary">{t(`howItWorks.${step.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="rounded-2xl p-10 bg-bg-card border border-border-color rounded-lg shadow-sm">
          <h2 className="text-2xl font-display font-bold mb-6">{t('cta.title')}</h2>
          <Link href="/auth/signup">
            <Button variant="gold" size="lg">{t('cta.button')}</Button>
          </Link>
        </div>
      </section>

      <footer className="text-center py-8 text-text-muted text-sm border-t border-border">
        © {new Date().getFullYear()} Ganus · {t('footer')}
      </footer>
    </div>
  )
}
