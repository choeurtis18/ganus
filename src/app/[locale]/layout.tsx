import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import '../globals.css'
import '@/styles/components.css'

export const metadata: Metadata = {
  title: "Ganus — IA préparation d'entretiens",
  description: "Maîtrisez vos entretiens grâce à des sessions d'entraînement basées sur l'IA. Bénéficiez de commentaires en temps réel, de conseils personnalisés et suivez vos progrès. Plateforme gratuite de préparation aux entretiens.",
  keywords: ['interview', 'preparation', 'AI', 'feedback', 'interview prep', 'mock interview', 'interview practice', 'interview coaching', 'interview feedback', 'interview tips', 'interview questions', 'interview answers', 'interview skills', 'interview training', 'interview platform', 'free interview prep', 'Ganus', 'IA', 'préparation d\'entretiens', 'feedback en temps réel', 'conseils personnalisés', 'suivi des progrès'],
  authors: [{ name: 'Choeurtis Tchounga', url: 'https://ganus.vercel.app' }],
  creator: 'Choeurtis Tchounga',
  publisher: 'Choeurtis Tchounga',
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
    title: 'Ganus — IA préparation d\'entretiens',
    description: "Maîtrisez vos entretiens grâce à des sessions d'entraînement basées sur l'IA. Bénéficiez de commentaires en temps réel, de conseils personnalisés et suivez vos progrès. Plateforme gratuite de préparation aux entretiens.",
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
    title: 'Ganus — IA préparation d\'entretiens',
    description: "Maîtrisez vos entretiens grâce à des sessions d'entraînement basées sur l'IA. Bénéficiez de commentaires en temps réel, de conseils personnalisés et suivez vos progrès. Plateforme gratuite de préparation aux entretiens.",
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
