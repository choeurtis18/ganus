'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { FeedbackData } from '@/lib/llm'

interface FeedbackCardProps {
  feedback: FeedbackData
  sessionId?: string
  messageIndex?: number
}

interface BreakdownDetail {
  pertinence: number
  clarte: number
  exemples: number
  profondeur: number
  communication: number
  totalScore: number
}

export function FeedbackCard({ feedback, sessionId, messageIndex }: FeedbackCardProps) {
  const t = useTranslations('chat')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailData, setDetailData] = useState<BreakdownDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenDetails = async () => {
    if (sessionId === undefined || messageIndex === undefined) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/chat/chats/${sessionId}/breakdown/${messageIndex}`)
      if (res.ok) {
        const { data } = await res.json()
        setDetailData(data)
        setDetailsOpen(true)
      }
    } catch (error) {
      console.error('Failed to fetch breakdown details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scoreColor =
    feedback.score >= 80 ? 'text-emerald border-emerald' :
    feedback.score >= 60 ? 'text-gold border-gold' :
    'text-orange border-orange'

  const scoreRing =
    feedback.score >= 80 ? 'border-emerald' :
    feedback.score >= 60 ? 'border-gold' :
    'border-orange'

  return (
    <>
      <div className="bg-bg-card border border-border-color rounded-[4px_18px_18px_18px] shadow-sm overflow-hidden text-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-color">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {t('feedback')}
            </span>
            {sessionId !== undefined && messageIndex !== undefined && (
              <button
                onClick={handleOpenDetails}
                disabled={isLoading}
                className={`text-xs font-semibold ${scoreColor.split(' ')[0]} hover:opacity-80 disabled:opacity-50 transition-colors text-left`}
              >
                {isLoading ? 'Chargement...' : 'Voir détails'}
              </button>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full border-2 ${scoreRing} flex flex-col items-center justify-center flex-shrink-0`}>
            <span className={`text-base font-bold leading-none ${scoreColor.split(' ')[0]}`}>
              {feedback.score}
            </span>
            <span className="text-[9px] text-text-muted leading-none">{t('score')}</span>
          </div>
        </div>

      {/* Analysis */}
      {feedback.analysis && (
        <p className="px-5 py-3 text-text-primary leading-relaxed border-b border-border-color">
          {feedback.analysis}
        </p>
      )}

      {/* Strengths */}
      {feedback.strengths.length > 0 && (
        <div className="px-5 py-3 bg-emerald/5 border-b border-border-color">
          <p className="text-xs font-bold text-emerald uppercase tracking-wider mb-2">
            ✓ {t('strengths')}
          </p>
          <ul className="space-y-1">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-text-secondary flex gap-2">
                <span className="text-emerald flex-shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements.length > 0 && (
        <div className="px-5 py-3 bg-orange/5">
          <p className="text-xs font-bold text-orange uppercase tracking-wider mb-2">
            ↑ {t('improvements')}
          </p>
          <ul className="space-y-1">
            {feedback.improvements.map((imp, i) => (
              <li key={i} className="text-text-secondary flex gap-2">
                <span className="text-orange flex-shrink-0">•</span>
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>

    {/* Details Modal */}
    {detailsOpen && detailData && (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setDetailsOpen(false)}
        />

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-color rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color sticky top-0 bg-bg-card">
              <h3 className="text-lg font-bold text-text-primary">Détails du score</h3>
              <button
                onClick={() => setDetailsOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Score Overview */}
              <div className="text-center">
                <div className="text-4xl font-bold text-text-primary">{detailData.totalScore}</div>
                <div className="text-sm text-text-muted">/ 100</div>
              </div>

              {/* Breakdown Bars */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Détail des critères</h4>

                {[
                  { key: 'pertinence', label: 'Pertinence', max: 30, color: 'emerald' },
                  { key: 'clarte', label: 'Clarté', max: 20, color: 'gold' },
                  { key: 'exemples', label: 'Exemples', max: 20, color: 'teal' },
                  { key: 'profondeur', label: 'Profondeur', max: 20, color: 'pink' },
                  { key: 'communication', label: 'Communication', max: 10, color: 'orange' },
                ].map(({ key, label, max, color }) => {
                  const value = detailData[key as keyof typeof detailData] as number
                  const percentage = (value / max) * 100

                  const colorClasses: Record<string, { text: string; bg: string }> = {
                    emerald: { text: 'text-emerald', bg: 'bg-emerald' },
                    gold: { text: 'text-gold', bg: 'bg-gold' },
                    teal: { text: 'text-teal', bg: 'bg-teal' },
                    pink: { text: 'text-pink', bg: 'bg-pink' },
                    orange: { text: 'text-orange', bg: 'bg-orange' },
                  }
                  const classes = colorClasses[color] || colorClasses.emerald

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-text-primary">{label}</span>
                        <span className={`text-sm font-bold ${classes.text}`}>
                          {value}/{max}
                        </span>
                      </div>
                      <div className="w-full bg-border-color rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${classes.bg} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Feedback sections from original card */}
              {feedback.analysis && (
                <div className="pt-4 border-t border-border-color">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Analyse</h4>
                  <p className="text-text-secondary leading-relaxed">{feedback.analysis}</p>
                </div>
              )}

              {feedback.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-emerald uppercase tracking-wider mb-2">✓ Points forts</h4>
                  <ul className="space-y-1">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="text-text-secondary flex gap-2 text-sm">
                        <span className="text-emerald flex-shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvements.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-orange uppercase tracking-wider mb-2">↑ À améliorer</h4>
                  <ul className="space-y-1">
                    {feedback.improvements.map((imp, i) => (
                      <li key={i} className="text-text-secondary flex gap-2 text-sm">
                        <span className="text-orange flex-shrink-0">•</span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border-color flex justify-end gap-2">
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-text-primary hover:bg-border-color rounded transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  )
}
