'use client'

import { useTranslations } from 'next-intl'
import type { CvAnalysis, CvCriterion } from '@/lib/llm-cv'

const scoreColorClass = (pct: number) =>
  pct >= 80 ? 'text-emerald' : pct >= 60 ? 'text-gold' : 'text-orange'
const scoreBarClass = (pct: number) =>
  pct >= 80 ? 'bg-emerald' : pct >= 60 ? 'bg-gold' : 'bg-orange'

interface CVAnalysisDisplayProps {
  analysis: CvAnalysis
}

function CriterionBar({ label, criterion }: { label: string; criterion: CvCriterion }) {
  const pct = Math.round((criterion.score / criterion.max) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary font-medium">{label}</span>
        <span className={`font-bold font-mono ${scoreColorClass(pct)}`}>
          {criterion.score}<span className="text-text-muted font-normal">/{criterion.max}</span>
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreBarClass(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {criterion.comment && (
        <p className="text-xs text-text-muted leading-relaxed">{criterion.comment}</p>
      )}
    </div>
  )
}

export default function CVAnalysisDisplay({ analysis }: CVAnalysisDisplayProps) {
  const t = useTranslations('cv')
  const pct = analysis.score

  // Criteria labels — hardcoded FR since CV analysis is always in FR
  const criteriaLabels: Record<keyof CvAnalysis['criteria'], string> = {
    presentation: 'Présentation & mise en page',
    experience:   'Expériences & projets',
    competences:  'Compétences techniques',
    coherence:    'Cohérence profil / postes visés',
    soft_skills:  'Soft skills & engagement',
  }

  const hasCriteria = analysis.criteria && Object.values(analysis.criteria).some((c) => c.max > 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Global score */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-sm text-text-secondary font-medium">{t('analysis.score')}</p>
          <p className={`text-3xl font-bold font-display ${scoreColorClass(pct)}`}>
            {analysis.score}<span className="text-base font-normal text-text-muted">/100</span>
          </p>
        </div>
        <div className="h-2.5 bg-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${scoreBarClass(pct)}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="bg-bg rounded-xl p-4 border border-border">
          <p className="text-sm leading-relaxed text-text-primary">{analysis.summary}</p>
        </div>
      )}

      {/* Two-column layout: Criteria left, Strengths/Improvements/Suggestions right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Criteria breakdown — left */}
        {hasCriteria && (
          <div className="bg-bg rounded-xl p-4 flex flex-col gap-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Détail par critère</p>
            {(Object.keys(criteriaLabels) as (keyof CvAnalysis['criteria'])[]).map((key) => (
              <CriterionBar key={key} label={criteriaLabels[key]} criterion={analysis.criteria[key]} />
            ))}
          </div>
        )}

        {/* Strengths, Improvements, Suggestions — right */}
        <div className="flex flex-col gap-5">
          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-emerald mb-2">{t('analysis.strengths')}</p>
              <ul className="flex flex-col gap-1.5">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                    <span className="text-emerald mt-0.5 flex-shrink-0">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis.improvements.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-orange mb-2">{t('analysis.improvements')}</p>
              <ul className="flex flex-col gap-1.5">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                    <span className="text-orange mt-0.5 flex-shrink-0">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-teal mb-2">{t('analysis.suggestions')}</p>
              <ul className="flex flex-col gap-1.5">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                    <span className="text-teal mt-0.5 flex-shrink-0">★</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
