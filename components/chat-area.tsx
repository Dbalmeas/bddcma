"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Card } from "./ui/card"
import { Send, FileText, AlertCircle, CheckCircle, Loader2, Copy, Share2, Download, Plus, Mic, MicOff, FileDown, ChevronDown, Zap, Brain } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import dynamic from 'next/dynamic'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useToast } from "./ui/use-toast"
import { useConversations } from "@/contexts/ConversationsContext"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useVoxtral } from "@/hooks/use-voxtral"
import {
  exportToJSON,
  exportToCSV,
  downloadFile,
  generateShareLink,
  loadConversation,
} from "@/lib/conversation-manager"
import { StructuredReport } from "./StructuredReport"
import { TypingIndicator } from "./typing-indicator"
import { usePowerUser } from "@/contexts/PowerUserContext"
import { useCanvas } from "@/contexts/CanvasContext"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { useIsMobile } from "@/hooks/use-mobile"

// Import dynamique pour éviter les erreurs SSR avec recharts
const DynamicChart = dynamic(() => import('./DynamicChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
})

// Suggestions contextuelles pour CMA CGM Shipping
// Adaptées aux données disponibles : période 2019 + Jan-Jun 2020, routes Asie-Moyen Orient/Inde
const suggestedQueries = [
  "Quel est le volume TEU depuis la Chine au premier semestre 2020 ?",
  "Quels clients peuvent créer des synergies logistiques import-export sur les mêmes zones ?",
  "Analyse des volumes par port chinois (Ningbo, Shanghai, Qingdao)",
  "Évolution mensuelle des volumes TEU entre janvier et juin 2020",
  "Quels sont les top 5 clients en volume TEU sur 2020 ?",
  "Opportunités de Match Back pour réutilisation des conteneurs",
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

interface ChatAreaProps {
  onMenuClick?: () => void
}

export function ChatArea({ onMenuClick }: ChatAreaProps = {}) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'reasoning'>('reasoning')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { isPowerUser, togglePowerUser } = usePowerUser()
  const isMobile = useIsMobile()

  const {
    currentConversationId,
    createNewConversation,
    updateConversation,
    loadConversationById,
  } = useConversations()

  // Reconnaissance vocale avec Voxtral (Mistral) - Priorité
  const {
    isRecording: isVoxtralRecording,
    transcript: voxtralTranscript,
    error: voxtralError,
    isSupported: isVoxtralSupported,
    isTranscribing,
    startRecording: startVoxtralRecording,
    stopRecording: stopVoxtralRecording,
    resetTranscript: resetVoxtralTranscript,
  } = useVoxtral()

  // Fallback: Web Speech API si Voxtral n'est pas disponible
  const {
    isListening,
    transcript: webSpeechTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  // Utiliser Voxtral en priorité, Web Speech en fallback
  const isListeningActive = isVoxtralRecording || isListening
  const transcript = voxtralTranscript || webSpeechTranscript
  const speechErrorFinal = voxtralError || speechError
  const isSpeechSupportedFinal = isVoxtralSupported || isSpeechSupported

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Scroller pour que le dernier message soit visible (pas tout en haut)
  const scrollToLastAssistantMessage = () => {
    setTimeout(() => {
      if (lastAssistantMessageRef.current && messagesContainerRef.current) {
        const container = messagesContainerRef.current
        const message = lastAssistantMessageRef.current
        const messageRect = message.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        
        // Si le message n'est pas visible, scroller juste assez pour le voir
        if (messageRect.top < containerRect.top || messageRect.top > containerRect.bottom - 100) {
          // Scroller pour que le message soit visible avec un peu de contexte au-dessus
          const scrollTop = container.scrollTop + messageRect.top - containerRect.top - 80
          container.scrollTo({ top: scrollTop, behavior: 'smooth' })
        }
      }
    }, 150) // Petit délai pour que le DOM soit mis à jour
  }

  useEffect(() => {
    // Scroller vers le dernier message quand il y a une nouvelle réponse
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant') {
      scrollToLastAssistantMessage()
    } else if (lastMessage?.role === 'user') {
      // Pour les messages utilisateur, scroller en bas
      scrollToBottom()
    }
  }, [messages])

  // Mettre à jour le message avec la transcription vocale
  useEffect(() => {
    if (transcript) {
      setMessage(transcript.trim())
    }
  }, [transcript])

  // Gérer les erreurs de reconnaissance vocale
  useEffect(() => {
    // Ne pas afficher d'erreur si c'est juste un fallback normal vers Web Speech API
    if (voxtralError && !voxtralError.includes('fallback') && !voxtralError.includes('unavailable')) {
      toast({
        title: "Erreur de reconnaissance vocale",
        description: voxtralError,
        variant: "destructive",
      })
    }
    
    if (speechError && !voxtralError) {
      toast({
        title: "Erreur de reconnaissance vocale",
        description: speechError,
        variant: "destructive",
      })
    }
  }, [speechErrorFinal, voxtralError, speechError, toast])

  // Gérer le toggle de la reconnaissance vocale
  // Web Speech API est prioritaire car elle fonctionne en temps réel sans serveur
  const toggleSpeechRecognition = () => {
    if (isListeningActive || isTranscribing) {
      // Arrêter l'enregistrement actif
      console.log('🛑 Stopping recording...')
      if (isListening) {
        stopListening()
      } else if (isVoxtralRecording) {
        stopVoxtralRecording()
      }
      // La transcription finale est déjà dans le message via useEffect
    } else {
      // Démarrer l'enregistrement - Web Speech API d'abord (temps réel, pas besoin de serveur)
      if (isSpeechSupported) {
        console.log('🎤 Starting Web Speech API recording...')
        resetTranscript()
        setMessage("")
        startListening()
        toast({
          title: "Reconnaissance vocale",
          description: "Parlez maintenant. La transcription est en temps réel.",
          duration: 2000,
        })
      } else if (isVoxtralSupported) {
        // Fallback vers Voxtral si Web Speech n'est pas supporté
        console.log('🎤 Starting Voxtral recording (fallback)...')
        resetVoxtralTranscript()
        setMessage("")
        startVoxtralRecording()
        toast({
          title: "Enregistrement audio",
          description: "Parlez maintenant. L'audio sera transcrit après l'arrêt.",
          duration: 2000,
        })
      } else {
        toast({
          title: "Reconnaissance vocale non disponible",
          description: "Votre navigateur ne supporte pas la reconnaissance vocale. Veuillez taper votre message.",
          variant: "destructive",
        })
      }
    }
  }

  // Arrêter l'écoute quand on envoie le message
  useEffect(() => {
    if (isLoading && isListeningActive) {
      if (isVoxtralRecording) {
        stopVoxtralRecording()
      }
      if (isListening) {
        stopListening()
      }
    }
  }, [isLoading, isListeningActive, isVoxtralRecording, isListening, stopVoxtralRecording, stopListening])

  // Charger la conversation courante si elle existe
  // Note: Ne pas recharger si on est en cours de chargement (pour éviter d'écraser les messages)
  useEffect(() => {
    const loadConv = async () => {
      // Ne pas recharger pendant le loading (évite la race condition)
      if (isLoading) return
      
      if (currentConversationId) {
        const conv = await loadConversationById(currentConversationId)
        if (conv && conv.messages && conv.messages.length > 0) {
          setMessages(conv.messages)
        }
      } else {
        // Réinitialiser les messages si pas de conversation sélectionnée
        setMessages([])
      }
    }
    loadConv()
  }, [currentConversationId, loadConversationById, isLoading])

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

  // Canvas context pour l'ouvrir pendant le loading
  const { openCanvasLoading } = useCanvas()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    // Ouvrir le Canvas en mode loading dès le début
    openCanvasLoading("Génération du dashboard...")

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

    // Sauvegarder immédiatement le message utilisateur dans la conversation
    if (convId) {
      updateConversation(convId, updatedMessages)
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

  const handleShareMessage = async (msg: Message) => {
    if (!currentConversationId) {
      toast({
        title: "Erreur",
        description: "Aucune conversation active à partager",
        variant: "destructive",
      })
      return
    }

    const conv = await loadConversationById(currentConversationId)
    if (!conv) {
      toast({
        title: "Erreur",
        description: "Impossible de charger la conversation",
        variant: "destructive",
      })
      return
    }

    try {
      // Préparer le texte à partager avec les statistiques si disponibles
      let shareText = msg.content
      
      if (msg.statistics && msg.statistics.total > 0) {
        shareText = `📊 Rapport CMA CGM\n\n${msg.content}\n\n`
        
        if (msg.statistics.totalTEU) {
          shareText += `📦 Volume total: ${msg.statistics.totalTEU.toLocaleString('fr-FR')} TEU\n`
        }
        if (msg.statistics.totalCount) {
          shareText += `📋 Nombre de bookings: ${msg.statistics.totalCount.toLocaleString('fr-FR')}\n`
        }
        if (msg.statistics.dateRange) {
          shareText += `📅 Période: ${new Date(msg.statistics.dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(msg.statistics.dateRange.end).toLocaleDateString('fr-FR')}\n`
        }
        
        shareText += `\n🔗 Lien vers le rapport complet:\n`
      }

      const shareUrl = generateShareLink(conv)
      shareText += shareUrl

      // Utiliser l'API Web Share si disponible (mobile)
      if (navigator.share && navigator.canShare) {
        try {
          await navigator.share({
            title: `Rapport CMA CGM - ${conv.title}`,
            text: shareText,
            url: shareUrl,
          })
          
          toast({
            title: "Rapport partagé !",
            description: "Le rapport a été partagé avec succès",
          })
          return
        } catch (shareError: any) {
          // L'utilisateur a annulé ou erreur de partage, continuer avec copie presse-papier
          if (shareError.name !== 'AbortError') {
            console.error('Erreur Web Share API:', shareError)
          }
        }
      }

      // Fallback: Copier dans le presse-papier
      await navigator.clipboard.writeText(shareText)
      
      toast({
        title: "Lien copié !",
        description: "Le lien du rapport a été copié dans le presse-papier",
      })
    } catch (error: any) {
      console.error('Erreur lors du partage:', error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de partager le rapport. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  const handleExportJSON = async () => {
    if (!currentConversationId) {
      toast({
        title: "No conversation",
        description: "Start a conversation first to export",
        variant: "destructive",
      })
      return
    }

    const conv = await loadConversationById(currentConversationId)
    if (!conv) return

    const json = exportToJSON(conv)
    const filename = `everdian-chat-${conv.id}.json`
    downloadFile(json, filename, 'application/json')

    toast({
      title: "Exported!",
      description: `Downloaded as ${filename}`,
    })
  }

  const handleExportCSV = async () => {
    if (!currentConversationId) {
      toast({
        title: "No conversation",
        description: "Start a conversation first to export",
        variant: "destructive",
      })
      return
    }

    const conv = await loadConversationById(currentConversationId)
    if (!conv) return

    const csv = exportToCSV(conv)
    const filename = `everdian-chat-${conv.id}.csv`
    downloadFile(csv, filename, 'text/csv')

    toast({
      title: "Exported!",
      description: `Downloaded as ${filename}`,
    })
  }

  // Fonction pour normaliser les caractères accentués pour PDF
  const normalizePDFText = (text: string): string => {
    if (!text) return ''
    // Remplacer les caractères accentués par leurs équivalents ASCII compatibles
    const replacements: Record<string, string> = {
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
      'à': 'a', 'â': 'a', 'ä': 'a', 'À': 'A', 'Â': 'A', 'Ä': 'A',
      'ù': 'u', 'û': 'u', 'ü': 'u', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
      'î': 'i', 'ï': 'i', 'Î': 'I', 'Ï': 'I',
      'ô': 'o', 'ö': 'o', 'Ô': 'O', 'Ö': 'O',
      'ç': 'c', 'Ç': 'C',
      'ñ': 'n', 'Ñ': 'N',
      'œ': 'oe', 'Œ': 'OE',
      'æ': 'ae', 'Æ': 'AE',
      '\u20AC': 'EUR',
      '\u00AB': '"', '\u00BB': '"',
      '\u2018': "'", '\u2019': "'",
      '\u201C': '"', '\u201D': '"',
      '\u2013': '-', '\u2014': '-',
      '\u2026': '...',
    }
    let result = text
    for (const [accent, replacement] of Object.entries(replacements)) {
      result = result.split(accent).join(replacement)
    }
    // Supprimer les caractères non-ASCII restants
    return result.replace(/[^\x00-\x7F]/g, '')
  }

  // Export PDF d'un message spécifique
  const handleExportPDF = async (msg: Message) => {
    try {
      // Import dynamique de jspdf
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 20

      // Header avec logo CMA CGM
      doc.setFillColor(0, 45, 89) // Bleu CMA CGM
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('CMA CGM', 15, 22)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text("Rapport d'Analyse", 15, 30)
      
      // Date
      doc.setFontSize(10)
      const dateStr = new Date().toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(normalizePDFText(dateStr), pageWidth - 15, 22, { align: 'right' })

      yPos = 50

      // Resume
      doc.setTextColor(0, 45, 89)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Resume', 15, yPos)
      yPos += 10

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      
      // Word wrap pour le resume
      const summaryLines = doc.splitTextToSize(normalizePDFText(msg.content), pageWidth - 30)
      doc.text(summaryLines, 15, yPos)
      yPos += summaryLines.length * 6 + 15

      // Statistiques si disponibles
      if (msg.statistics && msg.statistics.total > 0) {
        doc.setTextColor(0, 45, 89)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('Statistiques Cles', 15, yPos)
        yPos += 10

        const statsData = []
        if (msg.statistics.total) statsData.push(['Total Bookings', msg.statistics.total.toLocaleString('fr-FR').replace(/\s/g, ' ')])
        if (msg.statistics.totalTEU) statsData.push(['Volume TEU', msg.statistics.totalTEU.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' TEU'])
        if (msg.statistics.totalWeight) statsData.push(['Poids Total', msg.statistics.totalWeight.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' kg'])
        if (msg.period) statsData.push(['Periode', `${msg.period.start} - ${msg.period.end}`])
        if (msg.rowsAnalyzed) statsData.push(['Lignes Analysees', msg.rowsAnalyzed.toLocaleString('fr-FR').replace(/\s/g, ' ')])

        if (statsData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Metrique', 'Valeur']],
            body: statsData,
            theme: 'striped',
            headStyles: { fillColor: [0, 45, 89], textColor: 255 },
            alternateRowStyles: { fillColor: [240, 245, 250] },
            margin: { left: 15, right: 15 },
          })
          yPos = (doc as any).lastAutoTable.finalY + 15
        }

        // Top Clients si disponible
        if (msg.statistics.byClient && Object.keys(msg.statistics.byClient).length > 0) {
          if (yPos > 230) {
            doc.addPage()
            yPos = 20
          }

          doc.setTextColor(0, 45, 89)
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text('Top Clients', 15, yPos)
          yPos += 8

          const clientsData = Object.entries(msg.statistics.byClient)
            .sort(([, a]: any, [, b]: any) => (b.teu || 0) - (a.teu || 0))
            .slice(0, 10)
            .map(([name, data]: any) => [
              normalizePDFText(name.slice(0, 40)),
              (data.teu || 0).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' TEU',
              (data.count || 0).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' bookings'
            ])

          autoTable(doc, {
            startY: yPos,
            head: [['Client', 'TEU', 'Bookings']],
            body: clientsData,
            theme: 'striped',
            headStyles: { fillColor: [255, 111, 0], textColor: 255 },
            alternateRowStyles: { fillColor: [255, 250, 245] },
            margin: { left: 15, right: 15 },
          })
          yPos = (doc as any).lastAutoTable.finalY + 15
        }

        // Top Ports si disponible
        if (msg.statistics.byPOL && Object.keys(msg.statistics.byPOL).length > 0) {
          if (yPos > 230) {
            doc.addPage()
            yPos = 20
          }

          doc.setTextColor(0, 45, 89)
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text('Ports de Chargement (POL)', 15, yPos)
          yPos += 8

          const portsData = Object.entries(msg.statistics.byPOL)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => [normalizePDFText(name), count.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' bookings'])

          autoTable(doc, {
            startY: yPos,
            head: [['Port', 'Bookings']],
            body: portsData,
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: 255 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            margin: { left: 15, right: 15 },
          })
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Genere par CMA CGM Talk to Data - Page ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      // Telecharger
      const filename = `rapport-cma-cgm-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      toast({
        title: "PDF telecharge !",
        description: `Le rapport a ete enregistre sous ${filename}`,
      })
    } catch (error: any) {
      console.error('Erreur export PDF:', error)
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF. Veuillez réessayer.",
        variant: "destructive",
      })
    }
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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6 md:py-8 min-h-0 overscroll-contain" ref={messagesContainerRef}>
            <div className="max-w-4xl mx-auto w-full">
              {messages.length === 0 ? (
                <>
                  <div className="text-center mb-6 sm:mb-8 md:mb-12 pt-2 sm:pt-4 md:pt-8">
                    <div className="mb-4 sm:mb-6 md:mb-8">
                      <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-balance px-2" style={{ color: 'var(--primary)' }}>
                        CMA CGM Talk to Data
                      </h1>
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                        Posez vos questions sur vos données de shipping en langage naturel
                      </p>
                    </div>

                    <div className="grid gap-2 sm:gap-3 px-1 sm:px-2">
                      {suggestedQueries.slice(0, isMobile ? 4 : 6).map((query, i) => (
                        <Card
                          key={i}
                          className={`p-2.5 sm:p-3 md:p-4 bg-card/85 border border-border text-foreground hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group touch-manipulation ${
                            isMobile ? 'active:scale-[0.98]' : ''
                          }`}
                          onClick={() => handleSuggestedQuery(query)}
                        >
                          <p className="text-xs sm:text-sm text-foreground group-hover:text-foreground text-left">{query}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                  {messages.map((msg, msgIndex) => {
                    const isLastAssistantMessage = msg.role === 'assistant' && msgIndex === messages.length - 1
                    return (
                    <div 
                      key={msg.id} 
                      ref={isLastAssistantMessage ? lastAssistantMessageRef : null}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className={`max-w-[92%] sm:max-w-[90%] md:max-w-3xl ${msg.role === 'user' ? 'w-auto' : 'w-full'}`}>
                        {msg.role === 'user' ? (
                          <Card className="p-3 sm:p-4 border-2 transition-all duration-200 ease-in-out hover:shadow-md" style={{ 
                            backgroundColor: 'var(--secondary)', 
                            borderColor: 'var(--secondary)',
                            color: 'var(--secondary-foreground)'
                          }}>
                            <p className="text-xs sm:text-sm font-medium transition-colors duration-200">{msg.content}</p>
                          </Card>
                        ) : (
                          <div className="space-y-4 transition-all duration-300 ease-in-out">
                            {msg.statistics && msg.statistics.total > 0 ? (
                              <>
                                <div className="transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-left-2">
                                <StructuredReport
                                  summary={msg.content}
                                  statistics={msg.statistics}
                                  charts={msg.charts}
                                  proactiveInsights={msg.proactiveInsights}
                                  filtersApplied={msg.filtersApplied}
                                  period={msg.period}
                                  rowsAnalyzed={msg.rowsAnalyzed}
                                />
                                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => handleCopyMessage(msg.content)}
                                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 bg-background border border-border text-foreground hover:bg-foreground/5 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation"
                                  >
                                    <Copy className="h-3 w-3 mr-1 sm:mr-1.5 transition-transform duration-200 ease-in-out" />
                                    <span className="hidden xs:inline">Copy</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleShareMessage(msg)}
                                    className={`h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary shadow-sm transition-all font-medium touch-manipulation ${
                                      isMobile ? 'active:scale-95' : 'hover:scale-105'
                                    }`}
                                    title="Partager ce rapport"
                                  >
                                    <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                                    <span className="hidden xs:inline">Share</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleExportPDF(msg)}
                                    className={`h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground border border-secondary shadow-sm transition-all font-medium touch-manipulation ${
                                      isMobile ? 'active:scale-95' : 'hover:scale-105'
                                    }`}
                                    title="Télécharger ce rapport en PDF"
                                  >
                                    <FileDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                                    PDF
                                  </Button>
                                </div>
                                </div>
                              </>
                            ) : (
                              <Card className="p-4 bg-card border border-border transition-all duration-200 ease-in-out hover:shadow-md animate-in fade-in slide-in-from-left-2" style={{
                                color: 'var(--foreground)',
                              }}>
                                <div className="prose prose-sm max-w-none" style={{
                                  color: 'var(--foreground)',
                                }}>
                                  <p className="whitespace-pre-wrap transition-colors duration-200" style={{
                                    color: 'var(--foreground)',
                                    opacity: 1,
                                  }}>{msg.content}</p>
                                </div>
                                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/60 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => handleCopyMessage(msg.content)}
                                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 bg-background border border-border text-foreground hover:bg-foreground/5 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation"
                                  >
                                    <Copy className="h-3 w-3 mr-1 sm:mr-1.5 transition-transform duration-200 ease-in-out" />
                                    Copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleShareMessage(msg)}
                                    className={`h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary shadow-sm transition-all duration-200 ease-in-out font-medium touch-manipulation ${
                                      isMobile ? 'active:scale-95' : 'hover:scale-105'
                                    }`}
                                    title="Partager ce message"
                                  >
                                    <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
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
                  )})}

                  {isLoading && <TypingIndicator />}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-2 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 backdrop-blur bg-background/95 transition-all duration-300 ease-in-out shrink-0 safe-area-bottom" style={{
            borderTopColor: 'var(--secondary)',
            borderTopWidth: '2px',
          }}>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="relative flex items-end gap-1 sm:gap-1.5 md:gap-2">
                <Button type="button" size="sm" className="mb-1.5 sm:mb-2 h-9 w-9 sm:h-10 sm:w-10 p-0 bg-background border border-border text-foreground transition-all duration-200 ease-in-out hover:bg-foreground/5 touch-manipulation shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ease-in-out" />
                </Button>

                {/* Sélecteur de mode Rapide/Raisonnement */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      className="mb-1.5 sm:mb-2 gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 h-9 sm:h-10 bg-background border border-border text-foreground transition-all duration-200 ease-in-out hover:bg-foreground/5 touch-manipulation shrink-0"
                    >
                      {reasoningMode === 'fast' ? (
                        <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                      ) : (
                        <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                      )}
                      <span className="hidden md:inline text-xs">
                        {reasoningMode === 'fast' ? 'Rapide' : 'Raisonnement'}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem 
                      onClick={() => setReasoningMode('fast')}
                      className="flex items-start gap-3 p-3 cursor-pointer"
                    >
                      <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Rapide</span>
                        <span className="text-xs text-muted-foreground">Répond rapidement</span>
                      </div>
                      {reasoningMode === 'fast' && (
                        <CheckCircle className="h-4 w-4 text-primary ml-auto mt-0.5" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setReasoningMode('reasoning')}
                      className="flex items-start gap-3 p-3 cursor-pointer"
                    >
                      <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Raisonnement</span>
                        <span className="text-xs text-muted-foreground">Réfléchit sur des sujets complexes</span>
                      </div>
                      {reasoningMode === 'reasoning' && (
                        <CheckCircle className="h-4 w-4 text-primary ml-auto mt-0.5" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isListeningActive 
                      ? (isListening 
                          ? "🎤 Écoute en cours..."
                          : isTranscribing 
                            ? "🔄 Transcription..." 
                            : "🎤 Enregistrement...")
                      : "Posez votre question..."
                  }
                  className="min-h-[44px] sm:min-h-[48px] md:min-h-[52px] max-h-[120px] sm:max-h-[160px] md:max-h-[200px] resize-none border-2 focus-visible:ring-2 transition-all duration-200 ease-in-out text-sm rounded-xl"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: isListeningActive ? 'var(--primary)' : message.trim() ? 'var(--secondary)' : 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                  onFocus={(e) => {
                    if (!isListeningActive) {
                      e.currentTarget.style.borderColor = 'var(--secondary)'
                    }
                  }}
                  onBlur={(e) => {
                    if (!message.trim() && !isListeningActive) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  disabled={isLoading}
                />

                {/* Bouton microphone - Web Speech API prioritaire */}
                <Button
                  type="button"
                  size="sm"
                  onClick={toggleSpeechRecognition}
                  className={`mb-1.5 sm:mb-2 h-9 w-9 sm:h-10 sm:w-10 p-0 border-2 transition-all duration-200 ease-in-out active:scale-95 touch-manipulation shrink-0 ${
                    isListeningActive 
                      ? 'bg-red-500 hover:bg-red-600 border-red-500 animate-pulse' 
                      : isTranscribing
                        ? 'bg-blue-500 hover:bg-blue-600 border-blue-500'
                        : 'bg-background border-border text-foreground hover:bg-foreground/5'
                  }`}
                  disabled={isLoading || (!isSpeechSupported && !isVoxtralSupported) || isTranscribing}
                  title={
                    isTranscribing
                      ? "Transcription en cours..."
                      : !isSpeechSupported && !isVoxtralSupported
                        ? "Reconnaissance vocale non supportée"
                        : isListeningActive 
                          ? "Arrêter"
                          : "Voix"
                  }
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin transition-transform duration-200" />
                  ) : isListeningActive ? (
                    <MicOff className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ease-in-out" />
                  ) : (
                    <Mic className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ease-in-out" />
                  )}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="mb-1.5 sm:mb-2 h-9 w-9 sm:h-10 sm:w-10 p-0 border-2 transition-all duration-200 ease-in-out active:scale-95 touch-manipulation shrink-0"
                  style={{
                    backgroundColor: message.trim() ? 'var(--secondary)' : 'var(--primary)',
                    borderColor: message.trim() ? 'var(--secondary)' : 'var(--primary)',
                    color: 'var(--secondary-foreground)',
                  }}
                  disabled={!message.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin transition-transform duration-200" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ease-in-out" />
                  )}
                </Button>
              </div>
            </form>
          </div>
    </div>
  )
}
