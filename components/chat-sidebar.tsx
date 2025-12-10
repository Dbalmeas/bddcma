"use client"

import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Separator } from "./ui/separator"
import { Clock, Plus, Trash2, Settings, Sun, Moon } from "lucide-react"
import { useConversations } from "@/contexts/ConversationsContext"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { useToast } from "./ui/use-toast"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Logo } from "./logo"
import { Switch } from "./ui/switch"
import { useIsMobile } from "@/hooks/use-mobile"

const navigationItems = [
  { icon: Clock, label: "History" },
]

export function ChatSidebar() {
  const { conversations, setCurrentConversationId, deleteConversation, currentConversationId, loadConversationById } = useConversations()
  const { toast } = useToast()
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => setMounted(true), [])

  const currentTheme = theme === "system" ? systemTheme : theme
  const isDark = currentTheme === "dark"

  const handleLoadConversation = (id: string) => {
    setCurrentConversationId(id)
  }

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteConversation(id)
    toast({
      title: "Deleted",
      description: "Conversation deleted successfully",
    })
  }

  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent('new-chat'));
    // Fermer la sidebar mobile après création d'un nouveau chat
    if (window.innerWidth < 1024) {
      // La sidebar mobile se fermera automatiquement via le composant parent
    }
  }


  // Trier par date de mise à jour (plus récent en premier)
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return (
    <aside className="h-full flex flex-col bg-card/95 backdrop-blur-sm border-r border-border/50 transition-all duration-300 ease-in-out overflow-hidden">
      {/* Logo en haut de la sidebar */}
      <div className="px-3 sm:px-4 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border/50 transition-all duration-300 ease-in-out shrink-0">
        <div className="flex justify-center items-center mb-3 sm:mb-4 transition-all duration-300 ease-in-out" style={{ minHeight: '80px', height: 'auto', maxHeight: '113px' }}>
          <Logo />
        </div>
        {/* Contrôles thème et settings */}
        <div className="flex items-center justify-center gap-2">
          {mounted && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 rounded-full border border-border bg-background/70 transition-all duration-300 ease-in-out hover:bg-background/80">
              <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-all duration-200 ease-in-out" />
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Basculer thème clair/sombre"
                className="transition-all duration-300 ease-in-out"
              />
              <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-all duration-200 ease-in-out" />
            </div>
          )}
          <button
            type="button"
            aria-label="Settings"
            className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 border border-border rounded-full bg-background/80 text-foreground hover:bg-foreground/5 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 touch-manipulation"
          >
            <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ease-in-out" />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-4 pt-4 sm:pt-6 flex-1 overflow-y-auto overscroll-contain">
            <nav className="space-y-1.5 sm:space-y-2 mb-6 sm:mb-8">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`group flex w-full items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-xl text-foreground/90 hover:text-foreground hover:bg-accent/50 transition-all duration-300 ease-in-out relative overflow-hidden shadow-sm hover:shadow-md touch-manipulation ${
                    isMobile ? 'active:scale-[0.98]' : 'hover:scale-[1.01]'
                  }`}
                >
                  {/* Effet de brillance animé qui traverse */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                  
                  {/* Glow effect */}
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 blur-sm"></span>
                  
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ease-in-out group-hover:scale-125 group-hover:rotate-12 group-hover:text-primary relative z-10 shrink-0" />
                  <span className="relative z-10 transition-all duration-300 ease-in-out group-hover:translate-x-1 group-hover:font-semibold">
                    {item.label}
                  </span>
                  
                  {/* Ripple effect au clic */}
                  <span className="absolute inset-0 rounded-xl opacity-0 group-active:opacity-100 group-active:animate-ping bg-primary/30 transition-opacity duration-200"></span>
                </button>
              ))}
              
              <button
                type="button"
                onClick={handleNewChat}
                className={`group flex w-full items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-xl text-foreground/90 hover:text-foreground hover:bg-primary/20 hover:border-primary/50 border border-transparent transition-all duration-300 ease-in-out relative overflow-hidden shadow-sm hover:shadow-lg hover:shadow-primary/20 touch-manipulation ${
                  isMobile ? 'active:scale-[0.98]' : 'hover:scale-[1.01]'
                }`}
              >
                {/* Effet de brillance animé qui traverse */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                
                {/* Glow effect plus fort pour New Chat */}
                <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-md"></span>
                
                {/* Animation du plus avec rotation et scale */}
                <div className="relative z-10 shrink-0">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-500 ease-in-out group-hover:scale-150 group-hover:rotate-180 group-active:rotate-360 group-hover:text-primary" />
                </div>
                <span className="relative z-10 transition-all duration-300 ease-in-out group-hover:translate-x-2 font-semibold group-hover:text-primary">
                  New Chat
                </span>
                
                {/* Particules animées au hover avec mouvement */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <span className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-primary rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '1.5s' }}></span>
                  <span className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-ping" style={{ animationDelay: '0.3s', animationDuration: '1.5s' }}></span>
                  <span className="absolute top-3/4 left-3/4 w-1.5 h-1.5 bg-primary rounded-full animate-ping" style={{ animationDelay: '0.6s', animationDuration: '1.5s' }}></span>
                </span>
                
                {/* Ripple effect au clic */}
                <span className="absolute inset-0 rounded-xl opacity-0 group-active:opacity-100 group-active:animate-ping bg-primary/40 transition-opacity duration-200"></span>
              </button>
            </nav>

        <Separator className="my-4 sm:my-6 bg-border/50" />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-3 sm:mb-4 px-3 sm:px-4">RECENT SESSIONS</h3>
          <div className="space-y-2 sm:space-y-3 pb-4">
            {sortedConversations.length === 0 ? (
              <div className="px-3 sm:px-4 py-6 sm:py-8 text-center rounded-xl bg-muted/30 border border-border/30 mx-1">
                <p className="text-sm text-foreground/60 mb-1">No conversations yet.</p>
                <p className="text-xs text-foreground/50">Start asking questions!</p>
              </div>
            ) : (
              sortedConversations.map((conv) => {
                const firstUserMsg = conv.messages.find((m) => m.role === "user")
                const preview = firstUserMsg?.content.substring(0, 50) || "Empty conversation"
                const timeAgo = formatDistanceToNow(new Date(conv.updatedAt), {
                  addSuffix: true,
                  locale: fr,
                })
                const isActive = currentConversationId === conv.id

                return (
                  <Card
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv.id)}
                    className={`p-3 sm:p-4 rounded-xl transition-all duration-200 ease-in-out cursor-pointer group border-2 touch-manipulation mx-1 ${
                      isActive 
                        ? 'bg-accent/80 border-primary shadow-md' 
                        : 'bg-card border-border/50 hover:border-border hover:shadow-sm'
                    } ${isMobile ? 'active:scale-[0.98]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold mb-1 sm:mb-1.5 truncate ${
                          isActive ? 'text-foreground' : 'text-foreground/90'
                        }`}>{conv.title}</h4>
                        <p className={`text-xs mb-1.5 sm:mb-2 ${
                          isActive ? 'text-foreground/70' : 'text-foreground/50'
                        }`}>{timeAgo}</p>
                        <p className={`text-xs line-clamp-2 ${
                          isActive ? 'text-foreground/70' : 'text-foreground/60'
                        }`}>{preview}...</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out h-7 w-7 p-0 bg-destructive/20 hover:bg-destructive/40 border-destructive/30 rounded-lg hover:scale-110 active:scale-95 shrink-0 touch-manipulation"
                      >
                        <Trash2 className="h-3.5 w-3.5 transition-transform duration-200 ease-in-out" />
                      </Button>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

