'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import ReactMarkdown from 'react-markdown'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { FeedbackCard } from '@/components/chat/FeedbackCard'
import { Icon } from '@/components/ui/icon'
import type { FeedbackData } from '@/lib/llm'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  feedback?: FeedbackData
}

function ChatPageContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const t             = useTranslations('chat')

  const [sessionId, setSessionId]             = useState<string | null>(null)
  const [chatTitle, setChatTitle]             = useState('')
  const [messages, setMessages]               = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingFeedback, setStreamingFeedback] = useState<FeedbackData | undefined>(undefined)
  const [input, setInput]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [loadingSession, setLoadingSession]   = useState(false)
  const [error, setError]                     = useState('')
  const [sidebarOpen, setSidebarOpen]         = useState(true)
  const [refreshTrigger, setRefreshTrigger]   = useState(0)
  const [isMobile, setIsMobile]               = useState(false)
  const [showChat, setShowChat]               = useState(false)
  const [pendingNewChat, setPendingNewChat]   = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  const chatId = searchParams.get('id')

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setShowChat(true)
      return
    }
    if (chatId || pendingNewChat) {
      setShowChat(true)
    } else {
      setShowChat(false)
    }
  }, [isMobile, chatId, pendingNewChat])

  const loadSession = useCallback(async (id: string | null) => {
    if (!id) {
      setSessionId(null)
      setChatTitle('')
      setMessages([])
      return
    }
    try {
      setLoadingSession(true)
      const res = await fetch(`/api/chat/chats/${id}`)
      if (!res.ok) throw new Error()
      const body = await res.json()
      const data = body.data
      setSessionId(data.id)
      setChatTitle(data.title)
      setMessages(data.messages || [])
    } catch {
      setError(t('errors.failedToLoad'))
    } finally {
      setLoadingSession(false)
    }
  }, [t])

  useEffect(() => { loadSession(chatId) }, [chatId, loadSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSelectChat = (id: string) => {
    setPendingNewChat(false)
    if (id) {
      router.push(`?id=${id}`)
    } else {
      router.push('?')
    }
  }

  const handleNewChat = () => {
    setPendingNewChat(true)
    if (isMobile) setShowChat(true)
    router.replace('?')
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    setError('')
    setLoading(true)

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    textareaRef.current?.style && (textareaRef.current.style.height = 'auto')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, sessionId: sessionId || undefined }),
      })

      if (!response.ok) {
        const data = await response.json()
        setMessages((prev) => prev.slice(0, -1))
        setError(data.error || t('errors.failedToSend'))
        return
      }

      const newSessionId = response.headers.get('X-Session-Id')
      const isNewSession = !!newSessionId && !sessionId
      if (isNewSession) {
        setSessionId(newSessionId!)
        setPendingNewChat(false)
        // URL push deferred to after streaming to avoid triggering loadSession mid-stream
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      const OPEN = '[FEEDBACK]'
      const CLOSE = '[/FEEDBACK]'
      let rawBuffer = ''
      let feedbackDone = false
      let questionStart = 0
      let localFeedback: FeedbackData | undefined = undefined
      setStreamingContent('')
      setStreamingFeedback(undefined)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        rawBuffer += decoder.decode(value, { stream: true })

        if (!feedbackDone) {
          if (rawBuffer.startsWith(OPEN)) {
            const closeIdx = rawBuffer.indexOf(CLOSE)
            if (closeIdx !== -1) {
              try {
                localFeedback = JSON.parse(rawBuffer.slice(OPEN.length, closeIdx))
                setStreamingFeedback(localFeedback)
              } catch { /* keep undefined */ }
              feedbackDone = true
              questionStart = closeIdx + CLOSE.length
              setStreamingContent(rawBuffer.slice(questionStart))
            }
            // else: still waiting for end of feedback JSON
          } else {
            // Regular (non-structured) response
            feedbackDone = true
            questionStart = 0
            setStreamingContent(rawBuffer)
          }
        } else {
          setStreamingContent(rawBuffer.slice(questionStart))
        }
      }

      const questionText = rawBuffer.slice(questionStart)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: questionText,
        timestamp: new Date().toISOString(),
        ...(localFeedback ? { feedback: localFeedback } : {}),
      }])
      setStreamingContent('')
      setStreamingFeedback(undefined)

      if (isNewSession) {
        router.push(`?id=${newSessionId}`)
        setRefreshTrigger((n) => n + 1)
      }
    } catch {
      setMessages((prev) => prev.slice(0, -1))
      setError(t('errors.failedToSend'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const timeStr = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation sidebar */}
      {(isMobile ? !showChat : sidebarOpen) && (
        <ChatSidebar
          currentChatId={chatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Main chat area */}
      {(!isMobile || showChat) && (
        <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-[14px] border-b border-border-color flex items-center gap-3 bg-bg-card flex-shrink-0">
          {isMobile ? (
            <button
              onClick={() => { setPendingNewChat(false); setShowChat(false) }}
              className="bg-none border-none cursor-pointer text-text-muted flex p-1"
            >
              <Icon name="chevronLeft" size={20} color="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-none border-none cursor-pointer text-text-muted flex p-1"
            >
              <Icon name="menu" size={20} color="currentColor" />
            </button>
          )}

          <Image src="/Logo-Ganus.png" alt="Ganus" width={36} height={36} className="rounded-full flex-shrink-0 aspect-square object-contain object-top" unoptimized />

          <div>
            <div className="text-sm font-semibold text-text-primary">
              {chatTitle || t('emptyState')}
            </div>
            {sessionId && (
              <div className="text-xs text-text-muted flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                {t('inProgress')}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {loadingSession ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-text-muted text-sm">{t('loading')}</p>
            </div>
          ) : !sessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Image src="/Logo-Ganus.png" alt="Ganus" width={64} height={64} className="rounded-full" unoptimized />
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary mb-2">
                  {t('emptyStateTitle')}
                </p>
                <p className="text-sm text-text-secondary">
                  {t('emptyStateDescription')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {msg.role === 'assistant' ? (
                    <Image src="/Logo-Ganus.png" alt="Ganus" width={36} height={36} className="rounded-full flex-shrink-0 aspect-square object-contain object-top" unoptimized />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                      {t('me')}
                    </div>
                  )}

                  {/* Bubble(s) */}
                  <div className="flex flex-col gap-3 max-w-[68%]">
                    {/* Feedback card (assistant only, when present) */}
                    {msg.role === 'assistant' && msg.feedback && (
                      <FeedbackCard
                        feedback={msg.feedback}
                        sessionId={sessionId ?? undefined}
                        messageIndex={idx}
                      />
                    )}

                    {/* Message bubble */}
                    {msg.content && (
                      <div>
                        <div className={`px-[18px] py-[14px] shadow-sm text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'rounded-[18px_4px_18px_18px] text-white'
                            : 'rounded-[4px_18px_18px_18px] bg-bg-card border border-border-color text-text-primary'
                        }`} style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #10b981, #059669)' } : {}}>
                          {msg.role === 'user' ? (
                            <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                          ) : (
                            <ReactMarkdown components={{
                              p: ({ children }) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              ul: ({ children }) => <ul className="mt-1 mb-2 last:mb-0 space-y-1 pl-4">{children}</ul>,
                              li: ({ children }) => <li className="list-disc">{children}</li>,
                            }}>{msg.content}</ReactMarkdown>
                          )}
                        </div>
                        <div className={`text-xs text-text-muted mt-1.5 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {timeStr(msg.timestamp)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming: feedback card (appears while question streams) */}
              {streamingFeedback && !streamingContent && (
                <div className="flex gap-3">
                  <Image src="/Logo-Ganus.png" alt="Ganus" width={36} height={36} className="rounded-full flex-shrink-0 aspect-square object-contain object-top" unoptimized />
                  <FeedbackCard feedback={streamingFeedback} />
                </div>
              )}

              {/* Streaming: question bubble */}
              {streamingContent && (
                <div className="flex gap-3">
                  <Image src="/Logo-Ganus.png" alt="Ganus" width={36} height={36} className="rounded-full flex-shrink-0 aspect-square object-contain object-top" unoptimized />
                  <div className="flex flex-col gap-3 max-w-[68%]">
                    {streamingFeedback && <FeedbackCard feedback={streamingFeedback} />}
                    <div className="px-[18px] py-[14px] rounded-[4px_18px_18px_18px] bg-bg-card border border-border-color text-text-primary text-sm leading-relaxed shadow-sm">
                      <p className="whitespace-pre-wrap m-0">{streamingContent}</p>
                      <span className="inline-block w-[3px] h-4 bg-text-muted ml-1 align-middle animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Typing dots (loading before stream starts) */}
              {loading && !streamingContent && (
                <div className="flex gap-3 items-end">
                  <Image src="/Logo-Ganus.png" alt="Ganus" width={36} height={36} className="rounded-full flex-shrink-0 aspect-square object-contain object-top" unoptimized />
                  <div className="bg-bg-card border border-border-color rounded-[4px_18px_18px_18px] px-5 py-[14px] flex gap-[5px] items-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-[7px] h-[7px] rounded-full bg-text-muted" style={{ animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-2.5 flex-shrink-0">
            <div className="px-4 py-2.5 bg-red-600/10 text-red-600 rounded-lg text-xs">
              {error}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 py-4 border-t border-border-color bg-bg-card flex-shrink-0">
          {!sessionId && !pendingNewChat ? (
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald text-white border-none cursor-pointer text-sm font-semibold font-sans transition-opacity hover:opacity-85"
            >
              <Icon name="chat" size={16} color="#fff" />
              {t('newChat')}
            </button>
          ) : (
            <>
              <div className="flex gap-3 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder={t('placeholder')}
                  rows={2}
                  autoFocus={pendingNewChat}
                  className="flex-1 px-4 py-3 border-[1.5px] border-border-color focus:border-gold rounded-lg bg-bg-input text-text-primary text-sm font-sans resize-none outline-none leading-relaxed transition-colors max-h-40 overflow-y-auto box-border"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors border-none ${
                    input.trim() && !loading
                      ? 'bg-emerald cursor-pointer hover:bg-emerald-light'
                      : 'bg-border-color cursor-not-allowed'
                  }`}
                >
                  <Icon name="send" size={20} color={input.trim() && !loading ? '#fff' : 'currentColor'} />
                </button>
              </div>
              <p className="text-xs text-text-muted mt-2">
                {t('shortcutHint')}
              </p>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  const t = useTranslations('common')
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        {t('loading')}
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}
