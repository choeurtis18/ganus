interface AvatarProps {
  name?: string
  size?: 'sm' | 'md' | 'lg'
  src?: string
  className?: string
}

export function Avatar({ name = '', size = 'md', src, className = '' }: AvatarProps) {
  const colors = ['emerald', 'gold', 'teal', 'pink', 'orange']
  const colorIndex = name.charCodeAt(0) % 5
  const color = colors[colorIndex]

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  const bgColorClass = `bg-${color}`
  const classes = `flex items-center justify-center rounded-full font-semibold text-white ${sizeClass} ${bgColorClass}${className ? ` ${className}` : ''}`

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizeClass}${className ? ` ${className}` : ''}`}
      />
    )
  }

  return <div className={classes}>{initials}</div>
}
