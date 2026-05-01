'use client'

import { Icon } from '@/components/ui/icon'

interface StatCardProps {
  label: string
  value: string | number
  color?: 'emerald' | 'gold' | 'teal' | 'orange'
  icon?: string
  trend?: { value: number; label: string } | null
}

const colorVar: Record<string, string> = {
  emerald: 'var(--emerald)',
  gold: 'var(--gold)',
  teal: 'var(--teal)',
  orange: 'var(--orange)',
}

export default function StatCard({ label, value, color = 'emerald', icon, trend }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary uppercase font-semibold tracking-wide">{label}</p>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-bg flex items-center justify-center flex-shrink-0">
            <Icon name={icon} size={18} color={colorVar[color]} strokeWidth={2} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold font-display" style={{ color: colorVar[color] }}>{value}</p>
      {trend != null ? (
        <p className={`text-xs font-medium ${trend.value >= 0 ? 'text-emerald' : 'text-orange'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      ) : (
        <div className="h-4" />
      )}
    </div>
  )
}
