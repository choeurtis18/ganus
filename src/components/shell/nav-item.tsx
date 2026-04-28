'use client'

import { Icon } from '@/components/ui/icon'
import { Link } from '@/i18n/navigation'

interface NavItemProps {
  id: string
  label: string
  icon: string
  href: string
  isActive: boolean
  isCollapsed: boolean
}

export function NavItem({
  label,
  icon,
  href,
  isActive,
  isCollapsed,
}: NavItemProps) {
  return (
    <Link href={href}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          color: isActive ? 'var(--emerald)' : 'var(--text-secondary)',
          backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
        }}
      >
        <Icon name={icon} size={20} color="currentColor" />
        {!isCollapsed && <span style={{ fontSize: '14px', fontWeight: '500' }}>{label}</span>}
        {isActive && !isCollapsed && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'var(--emerald)',
            }}
          />
        )}
      </div>
    </Link>
  )
}
