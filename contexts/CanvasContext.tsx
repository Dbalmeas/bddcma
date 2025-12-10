"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

interface CanvasContent {
  code: string
  title: string
  language: "html" | "react"
}

interface CanvasContextType {
  isOpen: boolean
  isLoading: boolean
  content: CanvasContent | null
  openCanvas: (content: CanvasContent) => void
  openCanvasLoading: (title?: string) => void
  updateCanvasContent: (content: CanvasContent) => void
  closeCanvas: () => void
}

const CanvasContext = createContext<CanvasContextType | null>(null)

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState<CanvasContent | null>(null)

  const openCanvas = useCallback((newContent: CanvasContent) => {
    setContent(newContent)
    setIsLoading(false)
    setIsOpen(true)
  }, [])

  const openCanvasLoading = useCallback((title?: string) => {
    setContent({
      code: "",
      title: title || "Analyse en cours...",
      language: "html"
    })
    setIsLoading(true)
    setIsOpen(true)
  }, [])

  const updateCanvasContent = useCallback((newContent: CanvasContent) => {
    setContent(newContent)
    setIsLoading(false)
  }, [])

  const closeCanvas = useCallback(() => {
    setIsOpen(false)
    setIsLoading(false)
  }, [])

  return (
    <CanvasContext.Provider value={{ isOpen, isLoading, content, openCanvas, openCanvasLoading, updateCanvasContent, closeCanvas }}>
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider")
  }
  return context
}
