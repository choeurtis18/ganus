'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/toast'

interface ChatReport {
  summary: string | null
  feedback?: object
  strengths: string[]
  improvements: string[]
  suggestions: string[]
  messageCount: number
  averageScore: number | null
}

interface ChatReportModalProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
  onReportGenerated?: () => void
}

export default function ChatReportModal({
  sessionId,
  isOpen,
  onClose,
  onReportGenerated,
}: ChatReportModalProps) {
  const t = useTranslations('chat')
  const toast = useToast()
  const [report, setReport] = useState<ChatReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/chats/${sessionId}/report`)
      if (!res.ok) {
        setReport(null)
        setLoading(false)
        return
      }
      const data = await res.json()
      setReport(data.data)
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchReport()
  }, [isOpen, sessionId, fetchReport])

  const generateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/chat/chats/${sessionId}/report`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        toast(error.error || t('errors.analysisFailed'), 'error')
        setGenerating(false)
        return
      }
      const data = await res.json()
      setReport(data.data)
      toast(t('reportGenerated'), 'success')
      onReportGenerated?.()
    } catch {
      toast(t('errors.analysisFailed'), 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-bg-card border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">{t('chatReport.title')}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <Icon name="x" size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Icon name="history" size={32} color="var(--text-secondary)" />
              <p className="text-text-secondary">{t('chatReport.analyzing')}</p>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-text-secondary text-center">{t('chatReport.noAnalysis')}</p>
              <Button
                onClick={generateReport}
                disabled={generating}
                variant="primary"
              >
                {generating ? t('chatReport.generating') : t('chatReport.generate')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Average Score */}
              {report.averageScore !== null && (
                <div className="flex items-center justify-between bg-bg rounded-xl p-4 border border-border">
                  <span className="text-sm text-text-secondary">{t('chatReport.averageScore')}</span>
                  <span className="text-2xl font-bold text-emerald">{Math.round(report.averageScore)}/100</span>
                </div>
              )}

              {/* Summary */}
              {report.summary && (
                <div className="bg-bg rounded-xl p-4 border border-border">
                  <p className="text-sm leading-relaxed text-text-primary">{report.summary}</p>
                </div>
              )}

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Strengths & Improvements */}
                <div className="flex flex-col gap-5">
                  {/* Strengths */}
                  {Array.isArray(report.strengths) && report.strengths.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-emerald mb-2">{t('chatReport.strengths')}</p>
                      <ul className="flex flex-col gap-1.5">
                        {(report.strengths as string[]).map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                            <span className="text-emerald mt-0.5 flex-shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {Array.isArray(report.improvements) && report.improvements.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-orange mb-2">{t('chatReport.improvements')}</p>
                      <ul className="flex flex-col gap-1.5">
                        {(report.improvements as string[]).map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                            <span className="text-orange mt-0.5 flex-shrink-0">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Right: Suggestions */}
                {Array.isArray(report.suggestions) && report.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-teal mb-2">{t('chatReport.suggestions')}</p>
                    <ul className="flex flex-col gap-1.5">
                      {(report.suggestions as string[]).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                          <span className="text-teal mt-0.5 flex-shrink-0">★</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Regenerate button */}
              <Button
                onClick={generateReport}
                disabled={generating}
                variant="outline"
                fullWidth
              >
                {generating ? t('chatReport.generating') : t('chatReport.regenerate')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
