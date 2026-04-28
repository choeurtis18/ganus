'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import type { CvAnalysis } from '@/lib/llm-cv'

interface CVUploaderProps {
  hasExisting: boolean
  onAnalyzed: (analysis: CvAnalysis) => void
}

export default function CVUploader({ hasExisting, onAnalyzed }: CVUploaderProps) {
  const t = useTranslations('cv')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

  const upload = async (file: File) => {
    setError('')
    if (!ACCEPTED.includes(file.type)) { setError(t('errors.invalidType')); return }
    if (file.size > 5 * 1024 * 1024) { setError(t('errors.tooLarge')); return }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('cv', file)
      const res = await fetch('/api/profile/cv', { method: 'POST', body: form })
      const body = await res.json()
      if (!res.ok) {
        if (res.status === 429) { setError(t('rateLimit.message')); return }
        throw new Error(body.error || t('errors.uploadFailed'))
      }
      onAnalyzed(body.data.analysis as CvAnalysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.analysisFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleFile = (file: File | null) => { if (file) upload(file) }

  return (
    <div className="flex flex-col gap-3">
      {error && <div className="p-3 bg-red-600/10 text-red-600 rounded-lg text-sm">{error}</div>}

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragging ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0] ?? null) }}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="upload" size={32} color="var(--text-secondary)" />
        <p className="text-text-secondary text-sm mt-2">{t('upload.drag')}</p>
        <p className="text-text-muted text-xs mt-1">{t('upload.hint')}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <Button
        onClick={() => inputRef.current?.click()}
        variant={hasExisting ? 'outline' : 'primary'}
        disabled={uploading}
        icon={uploading ? undefined : 'upload'}
      >
        {uploading ? t('upload.uploading') : hasExisting ? t('upload.replace') : t('upload.button')}
      </Button>
    </div>
  )
}
