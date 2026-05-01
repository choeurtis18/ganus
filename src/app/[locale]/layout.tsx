import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import '../globals.css'
import '@/styles/components.css'

export const metadata: Metadata = {
  title: 'Ganus — AI Interview Prep',
  description: 'Master your interviews with AI-powered practice sessions. Get real-time feedback, personalized advice, and track your progress. Free interview preparation platform.',
  keywords: ['interview', 'preparation', 'AI', 'feedback', 'interview prep', 'mock interview'],
  authors: [{ name: 'Ganus', url: 'https://ganus.vercel.app' }],
  creator: 'Ganus',
  publisher: 'Ganus',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ganus.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://ganus.vercel.app',
    siteName: 'Ganus',
    title: 'Ganus — AI Interview Prep',
    description: 'Master your interviews with AI-powered practice sessions. Get real-time feedback and personalized advice.',
    images: [
      {
        url: '/Logo-Ganus.png',
        width: 1200,
        height: 630,
        alt: 'Ganus Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ganus — AI Interview Prep',
    description: 'Master your interviews with AI-powered practice sessions.',
    images: ['/Logo-Ganus.png'],
  },
  icons: {
    icon: '/Logo-Ganus.png',
    apple: '/Logo-Ganus.png',
  },
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} data-theme="light" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
