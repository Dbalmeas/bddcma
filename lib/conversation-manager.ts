/**
 * Gestionnaire de conversations
 * Sauvegarde et charge les conversations depuis localStorage
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  validation?: {
    valid: boolean
    confidence: number
    errors: string[]
    warnings: string[]
  }
  statistics?: any
  charts?: any[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = 'everdian_conversations'
const MAX_CONVERSATIONS = 10 // Limite réduite pour éviter les erreurs de quota localStorage
const MAX_MESSAGES_PER_CONVERSATION = 20 // Limite de messages par conversation

/**
 * Nettoie un message en retirant les grandes données pour économiser l'espace localStorage
 */
function stripLargeData(message: Message): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    validation: message.validation ? {
      valid: message.validation.valid,
      confidence: message.validation.confidence,
      errors: message.validation.errors.slice(0, 3), // Garder seulement 3 erreurs
      warnings: message.validation.warnings.slice(0, 3), // Garder seulement 3 warnings
    } : undefined,
    // Retirer rawData, charts, statistics, situationalReport, narrativeAnalysis, patternAnalysis, externalContext
    // Ces données peuvent être très volumineuses
  }
}

/**
 * Charge toutes les conversations depuis localStorage
 */
export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const conversations = JSON.parse(stored)
    // Convertir les dates string en objets Date
    return conversations.map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }))
  } catch (error) {
    console.error('Error loading conversations:', error)
    return []
  }
}

/**
 * Sauvegarde une conversation
 */
export function saveConversation(conversation: Conversation): void {
  if (typeof window === 'undefined') return

  try {
    const conversations = loadConversations()

    // Nettoyer les messages pour retirer les grandes données
    const cleanedConversation = {
      ...conversation,
      messages: conversation.messages
        .slice(-MAX_MESSAGES_PER_CONVERSATION) // Garder seulement les N derniers messages
        .map(stripLargeData),
      updatedAt: new Date(),
    }

    // Chercher si la conversation existe déjà
    const index = conversations.findIndex(c => c.id === conversation.id)

    if (index >= 0) {
      // Mettre à jour
      conversations[index] = cleanedConversation
    } else {
      // Ajouter nouvelle conversation
      conversations.unshift(cleanedConversation)
    }

    // Limiter le nombre de conversations
    const limited = conversations.slice(0, MAX_CONVERSATIONS)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
    } catch (quotaError: any) {
      // Si erreur de quota, essayer avec encore moins de conversations
      if (quotaError.name === 'QuotaExceededError' || quotaError.code === 22) {
        console.warn('localStorage quota exceeded, reducing to 5 conversations')
        const veryLimited = conversations.slice(0, 5)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(veryLimited))
        } catch (secondError) {
          // Si ça ne marche toujours pas, garder seulement 1 conversation
          console.warn('Still quota exceeded, keeping only 1 conversation')
          localStorage.setItem(STORAGE_KEY, JSON.stringify([cleanedConversation]))
        }
      } else {
        throw quotaError
      }
    }
  } catch (error) {
    console.error('Error saving conversation:', error)
    // Ne pas bloquer l'application, juste logger l'erreur
  }
}

/**
 * Supprime une conversation
 */
export function deleteConversation(id: string): void {
  if (typeof window === 'undefined') return

  try {
    const conversations = loadConversations()
    const filtered = conversations.filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting conversation:', error)
  }
}

/**
 * Charge une conversation spécifique
 */
export function loadConversation(id: string): Conversation | null {
  const conversations = loadConversations()
  return conversations.find(c => c.id === id) || null
}

/**
 * Génère un titre automatique basé sur le premier message
 */
export function generateTitle(firstMessage: string): string {
  // Prendre les 50 premiers caractères
  const title = firstMessage.substring(0, 50)
  return title.length < firstMessage.length ? title + '...' : title
}

/**
 * Export une conversation en JSON
 */
export function exportToJSON(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2)
}

/**
 * Export une conversation en CSV
 */
export function exportToCSV(conversation: Conversation): string {
  const headers = ['Role', 'Content', 'Timestamp', 'Valid', 'Confidence']
  const rows = conversation.messages.map(msg => [
    msg.role,
    `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes
    msg.timestamp.toISOString(),
    msg.validation?.valid ? 'true' : 'false',
    msg.validation?.confidence.toString() || 'N/A',
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')
}

/**
 * Télécharge un fichier
 */
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Génère un lien de partage (encode la conversation en base64)
 */
export function generateShareLink(conversation: Conversation): string {
  const data = {
    title: conversation.title,
    messages: conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })),
  }

  const json = JSON.stringify(data)
  const base64 = btoa(unescape(encodeURIComponent(json)))

  return `${window.location.origin}${window.location.pathname}?share=${base64}`
}

/**
 * Charge une conversation depuis un lien de partage
 */
export function loadFromShareLink(): Conversation | null {
  if (typeof window === 'undefined') return null

  try {
    const params = new URLSearchParams(window.location.search)
    const shareData = params.get('share')

    if (!shareData) return null

    const json = decodeURIComponent(escape(atob(shareData)))
    const data = JSON.parse(json)

    return {
      id: 'shared-' + Date.now(),
      title: data.title,
      messages: data.messages.map((m: any) => ({
        ...m,
        id: Date.now() + Math.random(),
        timestamp: new Date(m.timestamp),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    console.error('Error loading from share link:', error)
    return null
  }
}

/**
 * Nettoie toutes les conversations stockées (utile si localStorage est plein)
 */
export function clearAllConversations(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('All conversations cleared from localStorage')
  } catch (error) {
    console.error('Error clearing conversations:', error)
  }
}
