'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type FilterMode = 'all' | 'chat' | 'cv'
type DataPoint = { date: string; score: number; type: 'chat' | 'cv' }

interface ScoreChartProps {
  data: DataPoint[]
}

const CHART_H = 100
const Y_BOTTOM = 8
const USABLE_H = CHART_H - Y_BOTTOM

function scoreY(score: number): number {
  return CHART_H - Y_BOTTOM - (score / 100) * USABLE_H
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
}

export default function ScoreChart({ data }: ScoreChartProps) {
  const t = useTranslations('dashboard')
  const [filter, setFilter] = useState<FilterMode>('all')

  const limit = filter === 'all' ? 5 : 7

  const filteredData = (
    filter === 'chat'
      ? data.filter((d) => d.type === 'chat')
      : filter === 'cv'
        ? data.filter((d) => d.type === 'cv')
        : data
  ).slice(-limit)

  const hasData = filteredData.length > 0
  const n = filteredData.length

  const filters: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'chat', label: 'Entretiens' },
    { key: 'cv', label: 'CV' },
  ]

  const margin = 5       // % from each side
  const barGap = 1.5    // % between bars
  const SLOTS = 10      // always 10 slots regardless of data count
  const availableWidth = 100 - margin * 2
  const totalGapWidth = (SLOTS - 1) * barGap
  const barW = (availableWidth - totalGapWidth) / SLOTS
  const barX = (i: number) => margin + i * (barW + barGap)

  const barColor = (type: 'chat' | 'cv') =>
    type === 'cv' ? 'var(--gold)' : 'var(--emerald)'

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              filter === f.key
                ? 'bg-navy text-white'
                : 'text-text-secondary hover:bg-border/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-28 text-text-muted text-sm">
          {t('scoreChart.noData')}
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Y-axis labels — aligned with SVG only */}
          <div className="flex flex-col justify-between text-xs text-text-muted w-7 shrink-0 pt-5 pb-0">
            {[100, 75, 50, 25].map((v) => (
              <span key={v} className="leading-none">{v}</span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Score labels above bars — positioned to match bar slots */}
            {n > 0 && (
              <div className="relative h-5 w-full">
                {filteredData.map((d, i) => (
                  <div
                    key={i}
                    className="absolute text-xs font-semibold text-center"
                    style={{
                      left: `${barX(i)}%`,
                      width: `${barW}%`,
                      bottom: 2,
                      color: barColor(d.type),
                    }}
                  >
                    {d.score}
                  </div>
                ))}
              </div>
            )}

            {/* SVG — bars + grid only, no text */}
            <svg
              viewBox={`0 0 100 ${CHART_H}`}
              className="w-full"
              style={{ height: '8rem' }}
              preserveAspectRatio="none"
            >
              {/* Horizontal grid lines */}
              {[25, 50, 75, 100].map((v) => (
                <line
                  key={v}
                  x1="0" y1={scoreY(v)}
                  x2="100" y2={scoreY(v)}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                />
              ))}

              {/* Bars */}
              {filteredData.map((d, i) => {
                const x = barX(i)
                const barH = (d.score / 100) * USABLE_H
                const y = CHART_H - Y_BOTTOM - barH
                return (
                  <rect
                    key={i}
                    x={x} y={y}
                    width={barW} height={barH}
                    rx="1"
                    fill={barColor(d.type)}
                    fillOpacity="0.85"
                  />
                )
              })}
            </svg>

            {/* Date labels below bars — positioned to match bar slots */}
            {n > 0 && (
              <div className="relative h-5 w-full mt-1">
                {filteredData.map((d, i) => (
                  <div
                    key={i}
                    className="absolute text-xs text-text-muted text-center truncate"
                    style={{
                      left: `${barX(i)}%`,
                      width: `${barW}%`,
                      top: 0,
                    }}
                  >
                    {formatDate(d.date)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
