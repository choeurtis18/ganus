'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface RenameModalProps {
  chatId: string
  currentTitle: string
  isOpen: boolean
  onClose: () => void
  onSave: (newTitle: string) => Promise<void>
}

export function RenameModal({ currentTitle, isOpen, onClose, onSave }: RenameModalProps) {
  const t = useTranslations('sidebar')
  const tCommon = useTranslations('common')
  const [title, setTitle] = useState(currentTitle)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(currentTitle)
    setError('')
  }, [currentTitle, isOpen])

  const handleSave = async () => {
    const trimmed = title.trim()
    if (trimmed.length === 0) {
      setError(t('renameTitleEmpty'))
      return
    }
    if (trimmed.length > 100) {
      setError(t('renameTitleTooLong'))
      return
    }
    if (trimmed === currentTitle) {
      onClose()
      return
    }

    setLoading(true)
    setError('')
    try {
      await onSave(trimmed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('renameFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 border border-border-color">
        <h2 className="text-lg font-semibold text-text-primary mb-0">
          {t('renameTitle')}
        </h2>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('renameModalTitle')}
          maxLength={100}
          className="w-full px-3.5 py-3 border border-border-color focus:border-gold rounded-lg bg-bg-input text-text-primary text-sm font-sans transition-colors outline-none mt-4 mb-4"
        />

        {error && (
          <p className="text-xs text-red-600 mb-4 m-0">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors font-sans ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {tCommon('cancel')}
          </button>

          <button
            onClick={handleSave}
            disabled={loading || title === currentTitle}
            className={`px-4 py-2.5 text-sm text-white rounded-lg border-none font-semibold font-sans transition-colors ${
              loading || title === currentTitle
                ? 'bg-border-color cursor-not-allowed'
                : 'bg-emerald hover:bg-emerald-light'
            }`}
          >
            {loading ? '...' : tCommon('submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
