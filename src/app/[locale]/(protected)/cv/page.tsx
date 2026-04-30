'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CVUploader from '@/components/cv/CVUploader'
import CVAnalysisDisplay from '@/components/cv/CVAnalysisDisplay'
import { useToast } from '@/components/ui/toast'
import type { CvAnalysis } from '@/lib/llm-cv'

export default function CVPage() {
  const t = useTranslations('cv')
  const tProfile = useTranslations('profile')
  const toast = useToast()
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null)
  const [hasCV, setHasCV] = useState(false)
  const [analysisAt, setAnalysisAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((body) => {
        const d = body.data
        setHasCV(!!d.cvUrl)
        setAnalysis(d.cvAnalysis ?? null)
        setAnalysisAt(d.cvAnalysisAt ?? null)
      })
      .catch(() => toast(t('errors.analysisFailed'), 'error'))
      .finally(() => setLoading(false))
  }, [t]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/profile/cv')
      if (!res.ok) throw new Error()
      const body = await res.json()
      window.open(body.data.url, '_blank')
    } catch {
      toast(t('errors.analysisFailed'), 'error')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary"><p>{t('title')}</p></div>

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-1">{t('title')}</h1>
        <p className="text-sm text-text-secondary">{t('description') || 'Analysez votre CV pour obtenir des conseils personnalisés'}</p>
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Upload — top */}
        <Card padding="p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {hasCV ? t('upload.replace') : t('upload.button')}
          </h2>
          <CVUploader
            hasExisting={hasCV}
            onAnalyzed={(a) => {
              setAnalysis(a)
              setHasCV(true)
              setAnalysisAt(new Date().toISOString())
            }}
          />
        </Card>

        {/* Full analysis */}
        {analysis && (
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">{t('analysis.title')}</h2>
              <div className="flex items-center gap-3">
                {analysisAt && (
                  <p className="text-xs text-text-muted">
                    {tProfile('cv.lastAnalysis')} {new Date(analysisAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}
                {hasCV && (
                  <Button variant="outline" size="sm" icon="download" disabled={downloading} onClick={handleDownload}>
                    {downloading ? '...' : tProfile('cv.download')}
                  </Button>
                )}
              </div>
            </div>
            <CVAnalysisDisplay analysis={analysis} />
          </Card>
        )}
      </div>
    </div>
  )
}
