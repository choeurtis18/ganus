'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Icon } from '@/components/ui/icon'

interface LanguageSwitcherProps {
  collapsed?: boolean
}

export function LanguageSwitcher({ collapsed = false }: LanguageSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('layout')

  return (
    <button
      onClick={() =>
        router.replace(pathname, { locale: locale === 'fr' ? 'en' : 'fr' })
      }
      className={`flex items-center gap-2 w-full rounded-md border-none bg-transparent cursor-pointer font-semibold font-sans text-text-muted hover:text-text-primary transition-colors text-sm ${collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3.5 py-2.5'}`}
      title={locale === 'fr' ? t('switchToEnglish') : t('switchToFrench')}
    >
      <Icon name="language" size={16} color="currentColor" />
      {!collapsed && (locale === 'fr' ? 'EN' : 'FR')}
    </button>
  )
}
