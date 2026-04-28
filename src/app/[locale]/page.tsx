'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function HomePage() {
  const t = useTranslations('auth.login')
  const appName = t('title')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-100">
      <div className="text-center">
        <Image
          src="/Logo-long-Ganus.png"
          alt="Ganus"
          width={400}
          height={223}
          unoptimized
          style={{
            maxWidth: '400px',
            height: 'auto',
            objectFit: 'contain',
            marginBottom: '32px',
          }}
        />
        <p className="text-xl text-gray-600 mb-8">
          {t('heroSubtitle')}
        </p>
        <div className="space-x-4">
          <Link
            href="/auth/signup"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
          >
            {t('signup')}
          </Link>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-md font-medium hover:bg-gray-50"
          >
            {t('submit')}
          </Link>
        </div>
      </div>
    </div>
  )
}
