/**
 * Hook React pour gérer les conversations
 * Utilise conversation-manager pour localStorage
 */

import { useState, useEffect, useCallback } from 'react'
import {
  type Conversation,
  type Message,
  loadConversations,
  saveConversation,
  deleteConversation as deleteConv,
  loadConversation,
  generateTitle,
  loadFromShareLink,
} from '@/lib/conversation-manager'

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  // Charger les conversations au montage
  useEffect(() => {
    refreshConversations()

    // Charger depuis share link si présent
    const shared = loadFromShareLink()
    if (shared) {
      // Ajouter la conversation partagée aux conversations
      saveConversation(shared)
      setCurrentConversationId(shared.id)
      refreshConversations()

      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const refreshConversations = useCallback(() => {
    const loaded = loadConversations()
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

    saveConversation(newConv)
    setCurrentConversationId(id)
    refreshConversations()

    return id
  }, [refreshConversations])

  const updateConversation = useCallback(
    (id: string, messages: Message[]) => {
      const conv = loadConversation(id)
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

      saveConversation(updated)
      refreshConversations()
    },
    [refreshConversations]
  )

  const deleteConversation = useCallback(
    (id: string) => {
      deleteConv(id)
      if (currentConversationId === id) {
        setCurrentConversationId(null)
      }
      refreshConversations()
    },
    [currentConversationId, refreshConversations]
  )

  const loadConversationById = useCallback(
    (id: string) => {
      const conv = loadConversation(id)
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
  }
}
