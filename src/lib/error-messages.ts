export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  INVALID_TITLE: 'INVALID_TITLE',
  TITLE_LENGTH: 'TITLE_LENGTH',
  SERVER_ERROR: 'SERVER_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const

export const ERROR_MESSAGES: Record<string, Record<'en' | 'fr', string>> = {
  [ERROR_CODES.UNAUTHORIZED]: {
    en: 'Unauthorized',
    fr: 'Non autorisé',
  },
  [ERROR_CODES.RATE_LIMITED]: {
    en: 'Rate limit exceeded. Please try again later.',
    fr: 'Limite de messages atteinte. Réessaie dans 1 heure.',
  },
  [ERROR_CODES.INVALID_MESSAGE]: {
    en: 'Invalid message',
    fr: 'Message invalide',
  },
  [ERROR_CODES.SESSION_NOT_FOUND]: {
    en: 'Session not found',
    fr: 'Session introuvable',
  },
  [ERROR_CODES.CHAT_NOT_FOUND]: {
    en: 'Chat not found',
    fr: 'Chat introuvable',
  },
  [ERROR_CODES.INVALID_TITLE]: {
    en: 'Invalid title',
    fr: 'Titre invalide',
  },
  [ERROR_CODES.TITLE_LENGTH]: {
    en: 'Title must be 1-100 characters',
    fr: 'Le titre doit contenir entre 1 et 100 caractères',
  },
  [ERROR_CODES.SERVER_ERROR]: {
    en: 'Server error',
    fr: 'Erreur serveur',
  },
  [ERROR_CODES.INVALID_PASSWORD]: {
    en: 'Invalid password',
    fr: 'Mot de passe invalide',
  },
  [ERROR_CODES.PASSWORD_MISMATCH]: {
    en: 'Passwords do not match',
    fr: 'Les mots de passe ne correspondent pas',
  },
  [ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    fr: 'Utilisateur introuvable',
  },
  [ERROR_CODES.FORBIDDEN]: {
    en: 'Access denied',
    fr: 'Accès refusé',
  },
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: {
    en: 'Internal server error',
    fr: 'Erreur serveur interne',
  },
} as const

export function getErrorMessage(code: string, locale: 'en' | 'fr' = 'en'): string {
  return ERROR_MESSAGES[code]?.[locale] || ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR][locale]
}
