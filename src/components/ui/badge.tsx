import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'navy' | 'gold' | 'emerald' | 'orange' | 'teal' | 'pink' | 'red'
  size?: 'sm' | 'md'
  className?: string
}

const colorClasses = {
  navy: 'bg-navy/10 text-navy',
  gold: 'bg-gold/15 text-amber-900',
  emerald: 'bg-emerald/12 text-emerald-700',
  orange: 'bg-orange/12 text-orange-700',
  teal: 'bg-teal/12 text-teal-700',
  pink: 'bg-pink/12 text-pink-700',
  red: 'bg-red-600/12 text-red-700',
}

const sizeClasses = {
  sm: 'px-2 py-0.75 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function Badge({
  children,
  color = 'navy',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const classes = `inline-flex items-center ${colorClasses[color]} ${sizeClasses[size]} rounded-full font-semibold uppercase tracking-wider w-fit${className ? ` ${className}` : ''}`

  return <span className={classes}>{children}</span>
}
