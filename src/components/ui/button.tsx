import { ReactNode } from 'react'
import { Icon } from './icon'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  icon?: string
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const variantClasses = {
  primary: 'bg-emerald text-white hover:bg-emerald hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-emerald/50 active:scale-95',
  secondary: 'bg-transparent text-text-primary border-2 border-navy hover:bg-navy/5 focus:outline-none focus:ring-2 focus:ring-navy/50 active:scale-95',
  ghost: 'bg-transparent text-text-secondary hover:bg-border hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary/50 active:scale-95',
  gold: 'bg-gradient-to-r from-gold to-gold-light text-navy font-semibold hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-gold/50 active:scale-95',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600/50 active:scale-95',
  outline: 'bg-transparent text-text-primary border-2 border-border-color hover:bg-bg-card hover:border-text-primary focus:outline-none focus:ring-2 focus:ring-border/50 active:scale-95',
}

const sizeClasses = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  icon,
  fullWidth = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold border-none rounded-lg cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}${fullWidth ? ' w-full' : ''}${className ? ` ${className}` : ''}`

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}
