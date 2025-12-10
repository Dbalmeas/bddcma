/**
 * Hook React pour gérer les conversations
 * Utilise Supabase pour stocker les conversations
 */

import { useState, useEffect, useCallback } from 'react'
import {
  type Conversation,
  type Message,
  loadConversations as loadConversationsFromDB,
  saveConversation as saveConversationToDB,
  deleteConversation as deleteConvFromDB,
  loadConversation as loadConversationFromDB,
  generateTitle,
  loadFromShareLink,
} from '@/lib/conversation-manager'

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Charger les conversations au montage
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await refreshConversations()

      // Charger depuis share link si présent
      const shared = loadFromShareLink()
      if (shared) {
        // Ajouter la conversation partagée aux conversations
        await saveConversationToDB(shared)
        setCurrentConversationId(shared.id)
        await refreshConversations()

        // Nettoyer l'URL
        window.history.replaceState({}, '', window.location.pathname)
      }
      setIsLoading(false)
    }

    init()
  }, [])

  const refreshConversations = useCallback(async () => {
    const loaded = await loadConversationsFromDB()
    setConversations(loaded)
  }, [])

  const createNewConversation = useCallback((firstMessage?: string): string => {
    const id = `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const title = firstMessage ? generateTitle(firstMessage) : 'New Chat'

    const newConv: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Sauvegarder en async (fire and forget)
    saveConversationToDB(newConv).then(() => refreshConversations())
    setCurrentConversationId(id)

    return id
  }, [refreshConversations])

  const updateConversation = useCallback(
    async (id: string, messages: Message[]) => {
      const conv = await loadConversationFromDB(id)
      if (!conv) return

      // Mettre à jour le titre avec le premier message user si nécessaire
      let title = conv.title
      if (messages.length > 0 && conv.title === 'New Chat') {
        const firstUserMsg = messages.find((m) => m.role === 'user')
        if (firstUserMsg) {
          title = generateTitle(firstUserMsg.content)
        }
      }

      const updated: Conversation = {
        ...conv,
        title,
        messages,
        updatedAt: new Date(),
      }

      await saveConversationToDB(updated)
      await refreshConversations()
    },
    [refreshConversations]
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      await deleteConvFromDB(id)
      if (currentConversationId === id) {
        setCurrentConversationId(null)
      }
      await refreshConversations()
    },
    [currentConversationId, refreshConversations]
  )

  const loadConversationById = useCallback(
    async (id: string) => {
      const conv = await loadConversationFromDB(id)
      if (conv) {
        setCurrentConversationId(id)
      }
      return conv
    },
    []
  )

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    updateConversation,
    deleteConversation,
    loadConversationById,
    refreshConversations,
    isLoading,
  }
}
