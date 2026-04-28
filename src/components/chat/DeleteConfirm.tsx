'use client'

import { useTranslations } from 'next-intl'

interface DeleteConfirmProps {
  chatTitle: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirm({ chatTitle, isOpen, onCancel, onConfirm }: DeleteConfirmProps) {
  const t = useTranslations('sidebar')
  const tCommon = useTranslations('common')

  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm()
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 border border-border-color">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {t('deleteTitle')}
        </h2>

        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          {t('deleteConfirm', { title: chatTitle })}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors font-sans"
          >
            {tCommon('cancel')}
          </button>

          <button
            onClick={handleConfirm}
            className="px-4 py-2.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg border-none cursor-pointer transition-colors font-semibold font-sans"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
