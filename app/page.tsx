"use client"

import { GL } from "@/components/gl"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { TutorialDialog } from "@/components/tutorial-dialog"
import { PowerUserProvider } from "@/contexts/PowerUserContext"
import { CanvasProvider, useCanvas } from "@/contexts/CanvasContext"
import { ConversationsProvider } from "@/contexts/ConversationsContext"
import { CanvasPanel } from "@/components/CanvasPanel"
import { Leva } from "leva"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

function HomeContent() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const { isOpen: isCanvasOpen, isLoading: isCanvasLoading, content: canvasContent, closeCanvas } = useCanvas()

  return (
    <>
      <div className={`relative h-[100dvh] flex flex-col overflow-hidden text-foreground transition-colors duration-500 ease-in-out ${isCanvasOpen ? 'lg:w-[50%] xl:w-[55%]' : 'w-full'}`}>
        <div className="fixed inset-0 -z-10 opacity-30 transition-opacity duration-500">
          <GL hovering={false} />
        </div>

        {/* Header mobile avec bouton menu */}
        {isMobile && (
          <header className="shrink-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border/50 lg:hidden transition-all duration-300 ease-in-out safe-area-top">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="h-10 w-10 sm:h-9 sm:w-9 transition-all duration-200 ease-in-out hover:scale-110 active:scale-95 touch-manipulation"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-200 ease-in-out" />
              </Button>
              <div className="flex-1 flex justify-center">
                <h1 className="text-sm sm:text-base font-semibold text-foreground">CMA CGM Data</h1>
              </div>
              <div className="w-10 sm:w-9" /> {/* Spacer pour centrer le titre */}
            </div>
          </header>
        )}

        <main className="relative z-10 flex-1 flex flex-col overflow-hidden transition-colors duration-500 ease-in-out">
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Sidebar desktop */}
            <div className="hidden lg:block w-[260px] xl:w-[280px] 2xl:w-[300px] shrink-0">
              <ChatSidebar />
            </div>
            
            {/* Contenu principal */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <ChatArea onMenuClick={() => setMobileSidebarOpen(true)} />
            </div>
          </div>
        </main>

        {/* Sidebar mobile */}
        <MobileSidebar 
          open={mobileSidebarOpen} 
          onOpenChange={setMobileSidebarOpen} 
        />
      </div>

      {/* Canvas Panel (comme Gemini) */}
      <CanvasPanel
        isOpen={isCanvasOpen}
        isLoading={isCanvasLoading}
        onClose={closeCanvas}
        code={canvasContent?.code || ""}
        title={canvasContent?.title || "Visualisation"}
        language={canvasContent?.language || "html"}
      />

      <Toaster />
      <Leva hidden />
      <TutorialDialog />
    </>
  )
}

export default function Home() {
  return (
    <ConversationsProvider>
      <PowerUserProvider>
        <CanvasProvider>
          <HomeContent />
        </CanvasProvider>
      </PowerUserProvider>
    </ConversationsProvider>
  )
}
