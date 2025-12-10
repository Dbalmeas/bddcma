"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { X, Code2, Eye, Copy, Check, Download, Maximize2, Minimize2, RefreshCw, Loader2 } from "lucide-react"

interface CanvasPanelProps {
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  code: string
  title?: string
  language?: "html" | "react"
}

export function CanvasPanel({ isOpen, isLoading = false, onClose, code, title = "Visualisation", language = "html" }: CanvasPanelProps) {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview")
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1)
  }

  // Générer le HTML complet pour l'iframe
  const getPreviewHtml = () => {
    if (code.includes("<!DOCTYPE") || code.includes("<html")) {
      return code
    }
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; }
  </style>
</head>
<body>
${code}
</body>
</html>`
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay pour mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Panel Canvas */}
      <div 
        className={`fixed top-0 right-0 h-[100dvh] bg-background border-l border-border z-50 flex flex-col transition-all duration-300 ease-in-out ${
          isFullscreen 
            ? "w-full" 
            : "w-full lg:w-[50%] xl:w-[45%]"
        }`}
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b shrink-0 safe-area-top"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Code2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: 'var(--primary)' }} />
              <span className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--foreground)' }}>{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Tabs */}
            <div className="flex items-center bg-background rounded-lg p-0.5 sm:p-1 mr-1 sm:mr-2" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all touch-manipulation ${
                  activeTab === "code" 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all touch-manipulation ${
                  activeTab === "preview" 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Aperçu
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleRefresh} title="Rafraîchir" className="h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy} title="Copier le code" className="h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation">
              {copied ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} title="Télécharger" className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Réduire" : "Plein écran"} className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation">
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} title="Fermer" className="h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-6" style={{ background: 'var(--background)' }}>
              {/* Animation de loading style Gemini */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-muted animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
                  Analyse en cours...
                </p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Génération du dashboard interactif
                </p>
              </div>
              {/* Barre de progression animée */}
              <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full animate-pulse"
                  style={{ 
                    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    animation: 'loading-bar 1.5s ease-in-out infinite',
                    width: '50%'
                  }}
                />
              </div>
              <style jsx>{`
                @keyframes loading-bar {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(100%); }
                  100% { transform: translateX(-100%); }
                }
              `}</style>
            </div>
          ) : activeTab === "code" ? (
            <div className="h-full overflow-auto p-4" style={{ background: '#1e1e1e' }}>
              <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#d4d4d4' }}>
                <code>{code}</code>
              </pre>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              srcDoc={getPreviewHtml()}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title={title}
              style={{ background: 'white' }}
            />
          )}
        </div>
      </div>
    </>
  )
}
