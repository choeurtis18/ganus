import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <p className="text-8xl font-display font-bold text-navy mb-4">404</p>
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-3">
        {t('title')}
      </h1>
      <p className="text-text-secondary mb-8 max-w-sm">
        {t('description')}
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="primary">{t('backHome')}</Button>
        </Link>
        <Link href="/chat">
          <Button variant="outline">{t('goToChat')}</Button>
        </Link>
      </div>
    </div>
  )
}
