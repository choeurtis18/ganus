export function generateTitleFromMessage(message: string): string {
  const trimmed = message.trim()

  if (trimmed.length <= 50) {
    return trimmed
  }

  const words = trimmed.split(/\s+/).slice(0, 6)
  let title = words.join(' ')

  return title.length > 100 ? title.slice(0, 100) + '...' : title
}
