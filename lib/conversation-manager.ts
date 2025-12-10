/**
 * Gestionnaire de conversations
 * Utilise Supabase pour stocker les conversations et messages
 */

import { supabase } from './supabase'

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

// Types Supabase pour la base de données
interface DBConversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface DBMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  validation: any | null
  statistics: any | null
  charts: any[] | null
  created_at: string
}

/**
 * Convertit une conversation DB en conversation locale
 */
function dbToConversation(dbConv: DBConversation, dbMessages: DBMessage[]): Conversation {
  return {
    id: dbConv.id,
    title: dbConv.title,
    createdAt: new Date(dbConv.created_at),
    updatedAt: new Date(dbConv.updated_at),
    messages: dbMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      validation: msg.validation || undefined,
      statistics: msg.statistics || undefined,
      charts: msg.charts || undefined,
    })),
  }
}

/**
 * Charge toutes les conversations depuis Supabase
 */
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading conversations:', error)
      return []
    }

    if (!conversations || conversations.length === 0) {
      return []
    }

    // Charger les messages pour chaque conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('timestamp', { ascending: true })

        if (msgError) {
          console.error('Error loading messages for conversation:', conv.id, msgError)
          return dbToConversation(conv, [])
        }

        return dbToConversation(conv, messages || [])
      })
    )

    return conversationsWithMessages
  } catch (error) {
    console.error('Error loading conversations:', error)
    return []
  }
}

/**
 * Charge une conversation spécifique depuis Supabase
 */
export async function loadConversation(id: string): Promise<Conversation | null> {
  if (!id) return null
  
  try {
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    // Si pas de résultat ou erreur PGRST116 (no rows), retourner null silencieusement
    if (!conv || (error && error.code === 'PGRST116')) {
      return null
    }
    
    if (error) {
      console.error('Error loading conversation:', error)
      return null
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('timestamp', { ascending: true })

    if (msgError) {
      console.error('Error loading messages:', msgError)
      return dbToConversation(conv, [])
    }

    return dbToConversation(conv, messages || [])
  } catch (error) {
    // Ne pas logger les erreurs pour les conversations non trouvées
    if (error && typeof error === 'object' && Object.keys(error).length > 0) {
      console.error('Error loading conversation:', error)
    }
    return null
  }
}

/**
 * Sauvegarde ou met à jour une conversation
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  try {
    // Upsert la conversation
    const { error: convError } = await supabase
      .from('conversations')
      .upsert({
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.createdAt.toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (convError) {
      console.error('Error saving conversation:', convError)
      return
    }

    // Récupérer les messages existants pour cette conversation
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversation.id)

    const existingIds = new Set((existingMessages || []).map(m => m.id))

    // Filtrer les nouveaux messages seulement
    const newMessages = conversation.messages.filter(msg => !existingIds.has(msg.id))

    if (newMessages.length > 0) {
      // Insérer les nouveaux messages
      const { error: msgError } = await supabase
        .from('messages')
        .insert(
          newMessages.map(msg => ({
            id: msg.id,
            conversation_id: conversation.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
            validation: msg.validation || null,
            statistics: msg.statistics || null,
            charts: msg.charts || null,
          }))
        )

      if (msgError) {
        console.error('Error saving messages:', msgError)
      }
    }
  } catch (error) {
    console.error('Error saving conversation:', error)
  }
}

/**
 * Supprime une conversation et ses messages
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    // Supprimer d'abord les messages (contrainte de clé étrangère)
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id)

    if (msgError) {
      console.error('Error deleting messages:', msgError)
    }

    // Puis supprimer la conversation
    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (convError) {
      console.error('Error deleting conversation:', convError)
    }
  } catch (error) {
    console.error('Error deleting conversation:', error)
  }
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
  const rows = conversation.messages.map(msg => {
    const timestamp = msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime())
      ? msg.timestamp.toISOString()
      : new Date().toISOString()

    return [
      msg.role,
      `"${msg.content.replace(/"/g, '""')}"`,
      timestamp,
      msg.validation?.valid ? 'true' : 'false',
      msg.validation?.confidence.toString() || 'N/A',
    ]
  })

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
      messages: data.messages.map((m: any) => {
        const timestamp = new Date(m.timestamp)
        return {
          ...m,
          id: Date.now() + Math.random(),
          timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
        }
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    console.error('Error loading from share link:', error)
    return null
  }
}

/**
 * Supprime toutes les conversations (admin only)
 */
export async function clearAllConversations(): Promise<void> {
  try {
    // Supprimer tous les messages
    await supabase.from('messages').delete().neq('id', '')
    // Supprimer toutes les conversations
    await supabase.from('conversations').delete().neq('id', '')
    console.log('All conversations cleared from Supabase')
  } catch (error) {
    console.error('Error clearing conversations:', error)
  }
}
