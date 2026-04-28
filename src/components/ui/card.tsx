import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  onClick?: () => void
  hover?: boolean
  padding?: string
  className?: string
  style?: CSSProperties
}

export function Card({
  children,
  onClick,
  hover = false,
  padding = 'p-6',
  className = '',
  style,
}: CardProps) {
  const baseClasses = 'bg-bg-card border border-border-color rounded-lg shadow-sm'
  const hoverClass = hover ? 'hover:-translate-y-0.5 hover:shadow-md transition-all' : ''
  const classes = `${baseClasses} ${hoverClass}${className ? ` ${className}` : ''}`

  return (
    <div className={`${classes} ${padding}`} onClick={onClick} style={style}>
      {children}
    </div>
  )
}
