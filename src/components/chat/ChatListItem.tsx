'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Icon } from '@/components/ui/icon'

interface ChatSummary {
  id: string
  title: string
  createdAt: string
  messageCount: number
  lastMessage: string
}

interface ChatListItemProps {
  chat: ChatSummary
  isActive: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}

export function ChatListItem({ chat, isActive, onSelect, onRename, onDelete }: ChatListItemProps) {
  const t = useTranslations('sidebar')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayTitle = chat.title.length > 40 ? chat.title.slice(0, 40) + '...' : chat.title
  const createdDate = new Date(chat.createdAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    onRename()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete()
  }

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg mb-1 cursor-pointer transition-all flex justify-between items-start gap-2 relative ${
        isActive
          ? 'bg-emerald/8 border border-emerald/20'
          : 'bg-transparent border border-transparent hover:bg-border-color'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary m-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {displayTitle}
        </p>
        {chat.lastMessage && (
          <p className="text-xs text-text-muted mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {chat.lastMessage}
          </p>
        )}
        <p className="text-xs text-text-muted mt-1">
          {createdDate}
        </p>
      </div>

      <div className="relative flex-shrink-0">
        <button
          onClick={handleMenuClick}
          className={`p-1 bg-none border-none cursor-pointer transition-colors flex items-center justify-center ${
            menuOpen ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          title={tCommon('menu')}
        >
          <Icon name="moreVertical" size={14} color="currentColor" />
        </button>

        {menuOpen && (
          <div
            className="absolute top-full right-0 mt-1 bg-bg-card border border-border-color rounded-lg shadow-md z-10 min-w-[140px] overflow-hidden"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              onClick={handleRenameClick}
              className="w-full px-3 py-2.5 bg-none border-none cursor-pointer text-text-primary text-xs text-left transition-colors flex items-center gap-2 hover:bg-border-color"
            >
              <Icon name="pen" size={14} color="var(--text-primary)" />
              {t('rename')}
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-3 py-2.5 bg-none border-none border-t border-border-color cursor-pointer text-red-600 text-xs text-left transition-colors flex items-center gap-2 hover:bg-border-color"
            >
              <Icon name="x" size={14} color="#ef4444" />
              {t('delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
