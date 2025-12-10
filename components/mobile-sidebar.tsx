"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet"
import { ChatSidebar } from "./chat-sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState, useEffect } from "react"

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const isMobile = useIsMobile()

  // Fermer automatiquement sur desktop
  useEffect(() => {
    if (!isMobile && open) {
      onOpenChange(false)
    }
  }, [isMobile, open, onOpenChange])

  // Écouter les événements de nouvelle conversation pour fermer la sidebar
  useEffect(() => {
    const handleNewChat = () => {
      if (isMobile && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('new-chat', handleNewChat)
    return () => window.removeEventListener('new-chat', handleNewChat)
  }, [isMobile, open, onOpenChange])

  if (!isMobile) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-[85vw] max-w-[320px] sm:w-[320px] p-0 overflow-hidden safe-area-inset"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigation et historique des conversations</SheetDescription>
        </SheetHeader>
        <div className="h-full overflow-y-auto overscroll-contain">
          <ChatSidebar />
        </div>
      </SheetContent>
    </Sheet>
  )
}

