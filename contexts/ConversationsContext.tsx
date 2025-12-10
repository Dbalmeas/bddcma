"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
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

interface ConversationsContextType {
  conversations: Conversation[]
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
  createNewConversation: (firstMessage?: string) => string
  updateConversation: (id: string, messages: Message[]) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  loadConversationById: (id: string) => Promise<Conversation | null>
  refreshConversations: () => Promise<void>
  isLoading: boolean
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined)

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshConversations = useCallback(async () => {
    const loaded = await loadConversationsFromDB()
    setConversations(loaded)
  }, [])

  // Charger les conversations au montage
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await refreshConversations()

      // Charger depuis share link si présent
      const shared = loadFromShareLink()
      if (shared) {
        await saveConversationToDB(shared)
        setCurrentConversationId(shared.id)
        await refreshConversations()
        window.history.replaceState({}, '', window.location.pathname)
      }
      setIsLoading(false)
    }

    init()
  }, [refreshConversations])

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

    saveConversationToDB(newConv).then(() => refreshConversations())
    setCurrentConversationId(id)

    return id
  }, [refreshConversations])

  const updateConversation = useCallback(
    async (id: string, messages: Message[]) => {
      const conv = await loadConversationFromDB(id)
      if (!conv) return

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

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        currentConversationId,
        setCurrentConversationId,
        createNewConversation,
        updateConversation,
        deleteConversation,
        loadConversationById,
        refreshConversations,
        isLoading,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  )
}

export function useConversations() {
  const context = useContext(ConversationsContext)
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationsProvider')
  }
  return context
}
