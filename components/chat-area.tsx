"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Card } from "./ui/card"
import { Send, FileText, AlertCircle, CheckCircle, Loader2, Copy, Share2, Download, Plus } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import dynamic from 'next/dynamic'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useToast } from "./ui/use-toast"
import { useConversations } from "@/hooks/useConversations"
import {
  exportToJSON,
  exportToCSV,
  downloadFile,
  generateShareLink,
  loadConversation,
} from "@/lib/conversation-manager"
import { StructuredReport } from "./StructuredReport"
import { usePowerUser } from "@/contexts/PowerUserContext"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"

// Import dynamique pour éviter les erreurs SSR avec recharts
const DynamicChart = dynamic(() => import('./DynamicChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
})

// Suggestions contextuelles pour CMA CGM Shipping
// Adaptées aux données disponibles : période 2018-2019, clients CMA CGM, APL, CHENG LIE, ANL
const suggestedQueries = [
  "Quel est le volume TEU total par client en 2019 ?",
  "Quels sont les principaux ports de chargement ?",
  "Volume TEU par client avec analyse détaillée",
  "Analyse des volumes par route commerciale en 2019",
  "Comparaison des volumes entre CMA CGM et APL",
  "Quels sont les ports de déchargement les plus fréquentés ?",
]

interface Message {
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
  rawData?: any[]
  proactiveInsights?: any
  filtersApplied?: any
  period?: { start: string; end: string }
  rowsAnalyzed?: number
  powerUserMeta?: {
    sql?: string
    queryTime?: number
    tokensUsed?: number
    parsedQuery?: any
  }
}

export function ChatArea() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { isPowerUser, togglePowerUser } = usePowerUser()

  const {
    currentConversationId,
    createNewConversation,
    updateConversation,
    loadConversationById,
  } = useConversations()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Charger la conversation courante si elle existe
  useEffect(() => {
    if (currentConversationId) {
      const conv = loadConversationById(currentConversationId)
      if (conv) {
        setMessages(conv.messages)
      }
    }
  }, [currentConversationId, loadConversationById])

  useEffect(() => {
    const handleTemplate = (event: Event) => {
      const custom = event as CustomEvent<{ prompt: string }>
      if (custom.detail?.prompt) {
        setMessage(custom.detail.prompt)
        toast({
          title: "Modèle chargé",
          description: "Votre demande est prête à être envoyée.",
        })
      }
    }

    window.addEventListener('everdian-template', handleTemplate as EventListener)
    return () => {
      window.removeEventListener('everdian-template', handleTemplate as EventListener)
    }
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setMessage("")
    setIsLoading(true)

    // Créer ou mettre à jour la conversation
    let convId = currentConversationId
    if (!convId) {
      convId = createNewConversation(userMessage.content)
    }

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          // Les filtres sont extraits automatiquement de la conversation par le parser NLP
          // Pas besoin de passer des filtres UI manuels
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.text,
        timestamp: new Date(),
        validation: data.data.validation,
        statistics: data.data.statistics,
        charts: data.data.charts,
        rawData: data.data.rawData || [],
        proactiveInsights: data.data.proactiveInsights,
        filtersApplied: data.data.filtersApplied,
        period: data.data.period,
        rowsAnalyzed: data.data.rowsAnalyzed,
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)

      // Auto-save la conversation
      if (convId) {
        updateConversation(convId, finalMessages)
      }
    } catch (error: any) {
      console.error('Query error:', error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}. Please try again or rephrase your question.`,
        timestamp: new Date(),
        validation: {
          valid: false,
          confidence: 0,
          errors: [error.message],
          warnings: [],
        },
      }

      const finalMessages = [...updatedMessages, errorMessage]
      setMessages(finalMessages)

      // Auto-save même en cas d'erreur
      if (convId) {
        updateConversation(convId, finalMessages)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuery = (query: string) => {
    setMessage(query)
  }

  const handleNewChat = useCallback(() => {
    setMessages([])
    const newId = createNewConversation()
    toast({
      title: "New chat started",
      description: "Ready for your questions!",
    })
  }, [createNewConversation, toast])

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    })
  }

  const handleShareMessage = (msg: Message) => {
    if (!currentConversationId) return

    const conv = loadConversationById(currentConversationId)
    if (!conv) return

    const shareUrl = generateShareLink(conv)
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Share link copied!",
      description: "Anyone with this link can view the conversation",
    })
  }

  const handleExportJSON = () => {
    if (!currentConversationId) {
      toast({
        title: "No conversation",
        description: "Start a conversation first to export",
        variant: "destructive",
      })
      return
    }

    const conv = loadConversationById(currentConversationId)
    if (!conv) return

    const json = exportToJSON(conv)
    const filename = `everdian-chat-${conv.id}.json`
    downloadFile(json, filename, 'application/json')

    toast({
      title: "Exported!",
      description: `Downloaded as ${filename}`,
    })
  }

  const handleExportCSV = () => {
    if (!currentConversationId) {
      toast({
        title: "No conversation",
        description: "Start a conversation first to export",
        variant: "destructive",
      })
      return
    }

    const conv = loadConversationById(currentConversationId)
    if (!conv) return

    const csv = exportToCSV(conv)
    const filename = `everdian-chat-${conv.id}.csv`
    downloadFile(csv, filename, 'text/csv')

    toast({
      title: "Exported!",
      description: `Downloaded as ${filename}`,
    })
  }


  // Écouter l'événement new-chat depuis le header
  useEffect(() => {
    const handleNewChatEvent = () => {
      handleNewChat();
    };
    window.addEventListener('new-chat', handleNewChatEvent);
    return () => window.removeEventListener('new-chat', handleNewChatEvent);
  }, [handleNewChat]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <>
                  <div className="text-center mb-12 pt-8">
                    <div className="mb-8">
                      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance" style={{ color: 'var(--primary)' }}>
                        CMA CGM Talk to Data
                      </h1>
                      <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                        Posez vos questions sur vos données de shipping en langage naturel
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {suggestedQueries.map((query, i) => (
                        <Card
                          key={i}
                          className="p-4 bg-card/85 border border-border text-foreground hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => handleSuggestedQuery(query)}
                        >
                          <p className="text-sm text-foreground group-hover:text-foreground">{query}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl ${msg.role === 'user' ? 'w-auto' : 'w-full'}`}>
                        {msg.role === 'user' ? (
                          <Card className="p-4 border-2" style={{ 
                            backgroundColor: 'var(--secondary)', 
                            borderColor: 'var(--secondary)',
                            color: 'var(--secondary-foreground)'
                          }}>
                            <p className="text-sm font-medium">{msg.content}</p>
                          </Card>
                        ) : (
                          <div className="space-y-4">
                            {msg.statistics && msg.statistics.total > 0 ? (
                              <>
                                <StructuredReport
                                  summary={msg.content}
                                  statistics={msg.statistics}
                                  charts={msg.charts}
                                  rawData={msg.rawData}
                                  proactiveInsights={msg.proactiveInsights}
                                  filtersApplied={msg.filtersApplied}
                                  period={msg.period}
                                  rowsAnalyzed={msg.rowsAnalyzed}
                                />
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={() => handleCopyMessage(msg.content)}
                                    className="h-7 text-xs bg-background border border-border text-foreground hover:bg-foreground/5"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy Summary
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleShareMessage(msg)}
                                    className="h-7 text-xs bg-background border border-border text-foreground hover:bg-foreground/5"
                                  >
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Share Report
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Card className="p-4 bg-card border border-border text-foreground">
                                <div className="prose prose-sm max-w-none text-foreground">
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                                  <Button
                                    size="sm"
                                    onClick={() => handleCopyMessage(msg.content)}
                                    className="h-7 text-xs bg-background border border-border text-foreground hover:bg-foreground/5"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleShareMessage(msg)}
                                    className="h-7 text-xs bg-background border border-border text-foreground hover:bg-foreground/5"
                                  >
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Share
                                  </Button>
                                </div>
                              </Card>
                            )}

                            {msg.validation && !msg.statistics && (
                              <Alert
                                className={
                                  msg.validation.valid
                                    ? 'border-green-500/30 bg-green-500/10'
                                    : 'border-red-500/30 bg-red-500/10'
                                }
                              >
                                <div className="flex items-start gap-2">
                                  {msg.validation.valid ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <AlertDescription>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold">
                                          {msg.validation.valid ? 'Validated' : 'Validation Issues'}
                                        </span>
                                        <span className="text-xs opacity-70">
                                          Confidence: {((msg.validation.confidence || 0) * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      {msg.validation.errors.length > 0 && (
                                        <div className="text-xs mt-1 space-y-0.5">
                                          {msg.validation.errors.map((error, i) => (
                                            <div key={i} className="text-red-400">• {error}</div>
                                          ))}
                                        </div>
                                      )}
                                      {msg.validation.warnings.length > 0 && (
                                        <div className="text-xs mt-1 space-y-0.5">
                                          {msg.validation.warnings.map((warning, i) => (
                                            <div key={i} className="text-yellow-400">⚠ {warning}</div>
                                          ))}
                                        </div>
                                      )}
                                    </AlertDescription>
                                  </div>
                                </div>
                              </Alert>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <Card className="p-4 border" style={{ 
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                      }}>
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyse en cours...</span>
                        </div>
                      </Card>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-6 py-4 backdrop-blur" style={{
            borderTopColor: 'var(--secondary)',
            borderTopWidth: '2px',
            backgroundColor: 'var(--background)',
          }}>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="relative flex items-end gap-2">
                <Button type="button" size="sm" className="mb-2 bg-background border border-border text-foreground">
                  <FileText className="h-5 w-5" />
                </Button>

                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Posez votre question sur les bookings, volumes TEU, clients, ports..."
                  className="min-h-[52px] max-h-[200px] resize-none border-2 focus-visible:ring-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: message.trim() ? 'var(--secondary)' : 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--secondary)'
                  }}
                  onBlur={(e) => {
                    if (!message.trim()) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  size="sm"
                  className="mb-2 border-2 transition-all"
                  style={{
                    backgroundColor: message.trim() ? 'var(--secondary)' : 'var(--primary)',
                    borderColor: message.trim() ? 'var(--secondary)' : 'var(--primary)',
                    color: 'var(--secondary-foreground)',
                  }}
                  disabled={!message.trim() || isLoading}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </form>
          </div>
    </div>
  )
}
