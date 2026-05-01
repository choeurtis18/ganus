'use client'

import { ReactNode, useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { supabase, signOut } from '@/lib/supabase-client'
import { Icon } from '@/components/ui/icon'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

const NAV = [
  { id: 'home',    icon: 'home',    href: '/dashboard', disabled: false },
  { id: 'chat',    icon: 'chat',    href: '/chat',    disabled: false },
  { id: 'cv',      icon: 'file',    href: '/cv',      disabled: false },
  { id: 'profile', icon: 'user',    href: '/profile',  disabled: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark]         = useState(false)
  const [userEmail, setUserEmail]   = useState('')
  const [isMobile, setIsMobile]     = useState(false)
  const [isTablet, setIsTablet]     = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const t        = useTranslations('layout')

  useEffect(() => {
    const stored = localStorage.getItem('ganus_dark')
    const dark = stored ? JSON.parse(stored) : false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setIsMobile(w < 768)
      setIsTablet(w >= 768 && w < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('ganus_dark', JSON.stringify(next))
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    await signOut()
    setMobileOpen(false)
    router.push('/auth/login')
  }

  const displayName = userEmail
    ? userEmail.split('@')[0].replace(/[._-]/g, ' ')
    : ''

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()

  const renderSidebar = (withClose = false, collapsed = false) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center border-b border-border-color ${collapsed ? 'justify-center px-0 py-4' : 'justify-between px-5 py-4'}`}>
        {collapsed ? (
          <Image
            src="/Logo-Ganus.png"
            alt="Ganus"
            width={36}
            height={36}
            unoptimized
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
        ) : (
          <Image
            src="/Logo-long-Ganus.png"
            alt="Ganus"
            width={160}
            height={89}
            unoptimized
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
        )}
        {withClose && (
          <button
            onClick={() => setMobileOpen(false)}
            className="bg-none border-none cursor-pointer text-text-muted p-1 flex"
          >
            <Icon name="x" size={18} color="currentColor" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
        {NAV.map(({ id, icon, href, disabled }) => {
          const label    = t(`nav.${id}`)
          const isActive = !disabled && (pathname === href || pathname.startsWith(href + '/'))

          if (disabled) {
            return (
              <div key={id} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-md text-text-muted opacity-45 cursor-not-allowed text-sm ${collapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-3.5'}`}>
                <Icon name={icon} size={20} color="currentColor" />
                {!collapsed && <span>{label}</span>}
              </div>
            )
          }

          return (
            <Link key={id} href={href} onClick={() => setMobileOpen(false)}>
              <div
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-md cursor-pointer text-sm transition-all ${
                  isActive
                    ? 'bg-emerald/10 text-emerald font-semibold'
                    : 'text-text-secondary hover:bg-border-color'
                } ${collapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-3.5'}`}
              >
                <Icon name={icon} size={20} color="currentColor" />
                {!collapsed && <span>{label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-border-color flex flex-col gap-1">
        {/* Theme */}
        <button onClick={toggleDark} title={collapsed ? (isDark ? t('themeLight') : t('themeDark')) : undefined} className={`flex items-center gap-3 rounded-md border-none bg-transparent cursor-pointer text-text-muted hover:bg-border-color transition-colors text-sm font-sans w-full ${collapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-3.5'}`}>
          <Icon name={isDark ? 'sun' : 'moon'} size={18} color="currentColor" />
          {!collapsed && <span>{isDark ? t('themeLight') : t('themeDark')}</span>}
        </button>

        {/* Language */}
        <LanguageSwitcher collapsed={collapsed} />

        {/* User */}
        {userEmail && (
          <button onClick={() => { router.push('/profile'); setMobileOpen(false) }} title={collapsed ? displayName : undefined} className={`flex items-center gap-2.5 rounded-md border-none bg-transparent cursor-pointer w-full ${collapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-3.5'}`}>
            <div className="w-8 h-8 rounded-full bg-emerald flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {initials}
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap capitalize">
                {displayName}
              </span>
            )}
          </button>
        )}

        {/* Logout */}
        <button onClick={handleLogout} title={collapsed ? t('logout') : undefined} className={`flex items-center gap-3 rounded-md border-none bg-transparent cursor-pointer text-text-muted hover:bg-border-color transition-colors text-sm font-sans w-full ${collapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-3.5'}`}>
          <Icon name="logout" size={18} color="currentColor" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar (desktop + tablette) */}
      {!isMobile && (
        <aside className={`${isTablet ? 'w-[72px]' : 'w-60'} bg-bg-sidebar border-r border-border-color flex-shrink-0 overflow-hidden flex flex-col transition-all duration-200`}>
          {renderSidebar(false, isTablet)}
        </aside>
      )}

      {/* Mobile navbar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-49 h-[60px] bg-bg-card border-b border-border-color flex items-center justify-between px-4">
          <Image
            src="/Logo-Ganus.png"
            alt="Ganus"
            height={36}
            width={36}
            unoptimized
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-transparent border-none cursor-pointer text-text-primary flex"
          >
            <Icon name="menu" size={20} color="currentColor" />
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && isMobile && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50"
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <aside className={`fixed top-0 left-0 h-full z-50 w-60 bg-bg-sidebar border-r border-border-color transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {renderSidebar(true)}
        </aside>
      )}

      {/* Main */}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-bg ${isMobile ? 'mt-[60px]' : 'mt-0'}`}>
        {children}
      </main>
    </div>
  )
}
