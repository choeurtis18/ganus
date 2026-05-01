'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/ui/icon'
import { ChatListItem } from './ChatListItem'
import { RenameModal } from './RenameModal'
import { DeleteConfirm } from './DeleteConfirm'

interface ChatSummary {
  id: string
  title: string
  createdAt: string
  messageCount: number
  lastMessage: string
}

interface ChatSidebarProps {
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  refreshTrigger?: number
}

export function ChatSidebar({ currentChatId, onSelectChat, onNewChat, refreshTrigger }: ChatSidebarProps) {
  const t = useTranslations('sidebar')
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const loadChats = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/chat/chats?limit=50')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setChats(data.data?.chats || [])
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadChats() }, [refreshTrigger, loadChats])

  const handleRename = async (newTitle: string) => {
    if (!selectedChat) return
    const res = await fetch(`/api/chat/chats/${selectedChat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (!res.ok) throw new Error(t('error'))
    setChats(chats.map((c) => (c.id === selectedChat.id ? { ...c, title: newTitle } : c)))
  }

  const handleDelete = async () => {
    if (!selectedChat) return
    const res = await fetch(`/api/chat/chats/${selectedChat.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(t('error'))
    setChats(chats.filter((c) => c.id !== selectedChat.id))
    if (currentChatId === selectedChat.id) onSelectChat('')
  }

  return (
    <>
      <div className="w-80 flex-shrink-0 border-r border-border-color flex flex-col bg-bg-sidebar overflow-hidden">
        {/* Header */}
        <div className="px-4 py-5 border-b border-border-color">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {t('conversations')}
            </span>
          </div>
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald text-white border-none cursor-pointer text-xs font-semibold font-sans transition-opacity hover:opacity-85 mb-3"
          >
            <Icon name="chat" size={15} color="#fff" />
            {t('newChat')}
          </button>
          <input
            type="text"
            placeholder={t('search') || 'Rechercher...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full box-border px-3 py-2 rounded-lg border border-border-color focus:border-gold bg-bg-input text-text-primary text-xs font-sans outline-none transition-colors"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-4 py-4 text-xs text-text-muted text-center">{t('loading')}</p>
          ) : error ? (
            <div className="px-4 py-4">
              <p className="text-xs text-red-600 mb-2">{error}</p>
              <button onClick={loadChats} className="text-xs text-emerald bg-none border-none cursor-pointer">{t('retry')}</button>
            </div>
          ) : chats.length === 0 ? (
            <p className="px-4 py-4 text-xs text-text-muted text-center">{t('empty')}</p>
          ) : filteredChats.length === 0 ? (
            <p className="px-4 py-4 text-xs text-text-muted text-center">{t('noResults')}</p>
          ) : (
            filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={currentChatId === chat.id}
                onSelect={() => onSelectChat(chat.id)}
                onRename={() => { setSelectedChat(chat); setRenameOpen(true) }}
                onDelete={() => { setSelectedChat(chat); setDeleteOpen(true) }}
              />
            ))
          )}
        </div>
      </div>

      {selectedChat && (
        <>
          <RenameModal
            chatId={selectedChat.id}
            currentTitle={selectedChat.title}
            isOpen={renameOpen}
            onClose={() => setRenameOpen(false)}
            onSave={handleRename}
          />
          <DeleteConfirm
            chatTitle={selectedChat.title}
            isOpen={deleteOpen}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
          />
        </>
      )}
    </>
  )
}
