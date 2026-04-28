'use client'

import { useState, CSSProperties } from 'react'
import { Icon } from './icon'

interface InputProps {
  label?: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  icon?: string
  hint?: string
  error?: string
  disabled?: boolean
  className?: string
  style?: CSSProperties
}

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  hint,
  error,
  disabled = false,
  className = '',
  style,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ''}`} style={style}>
      {label && (
        <label className="text-xs mb-2 font-semibold text-text-secondary uppercase tracking-widest">
          {label}
        </label>
      )}

      <div className={(icon || isPassword) ? 'relative flex items-center' : undefined}>
        {icon && (
          <div className="absolute left-3.5 text-text-muted pointer-events-none">
            <Icon name={icon} size={17} color="currentColor" />
          </div>
        )}

        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3.5 py-3 border rounded-xl bg-bg-input text-text-primary font-normal text-sm transition-all duration-200 placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 
            ${ error
              ? 'border-red-600 hover:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/20'
              : 'border-border-color hover:border-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20'
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 bg-transparent border-none cursor-pointer text-text-muted hover:text-text-secondary transition-colors disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <Icon
              name={showPassword ? 'eyeOff' : 'eye'}
              size={17}
              color="currentColor"
            />
          </button>
        )}
      </div>

      {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
      {hint && !error && <div className="mt-2 text-xs text-text-muted">{hint}</div>}
    </div>
  )
}
