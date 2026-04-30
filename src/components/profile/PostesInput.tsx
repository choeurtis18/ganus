'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { POSTES_PREDEFINED } from '@/lib/profile-data'
import { Badge } from '@/components/ui/badge'

interface PostesInputProps {
  value: string[]
  onChange: (postes: string[]) => void
}

export default function PostesInput({ value, onChange }: PostesInputProps) {
  const t = useTranslations('profile')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const suggestions = query.length > 0
    ? POSTES_PREDEFINED.filter(
        (p) => p.toLowerCase().includes(query.toLowerCase()) && !value.includes(p)
      ).slice(0, 6)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addPoste = (poste: string) => {
    if (value.length >= 5 || value.includes(poste)) return
    onChange([...value, poste])
    setQuery('')
    setOpen(false)
  }

  const removePoste = (poste: string) => onChange(value.filter((p) => p !== poste))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) addPoste(query.trim())
    }
  }

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p) => (
            <div key={p} className="flex items-center gap-1">
              <Badge color="teal" size="sm">{p}</Badge>
              <button
                onClick={() => removePoste(p)}
                className="text-text-muted hover:text-text-primary text-xs leading-none"
                aria-label={`Retirer ${p}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < 5 && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('jobsSearchPlaceholder')}
            className="w-full px-3 py-2 rounded-lg border border-border text-text-primary bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
          />

          {open && suggestions.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-md overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); addPoste(s) }}
                  className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-text-muted">{t('jobsHint')}</p>
    </div>
  )
}
