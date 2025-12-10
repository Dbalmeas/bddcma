"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "./ui/button"
import { Code2, Loader2, ExternalLink } from "lucide-react"

// Import dynamique pour éviter les erreurs SSR
const SandpackCanvas = dynamic(
  () => import("./SandpackCanvas").then(mod => mod.SandpackCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
)

interface CodePreviewButtonProps {
  code: string
  language?: "react" | "html" | "vanilla"
  title?: string
}

export function CodePreviewButton({ code, language = "react", title = "Preview interactive" }: CodePreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!code) return null

  return (
    <div className="my-4">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="gap-2"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          <Code2 className="h-4 w-4" />
          Ouvrir la preview interactive
          <ExternalLink className="h-3.5 w-3.5 ml-1" />
        </Button>
      ) : (
        <SandpackCanvas
          code={code}
          language={language}
          title={title}
          onClose={() => setIsOpen(false)}
          height="450px"
        />
      )}
    </div>
  )
}

// Composant pour détecter et afficher automatiquement les blocs de code
interface AutoCodePreviewProps {
  content: string
}

export function AutoCodePreview({ content }: AutoCodePreviewProps) {
  // Regex pour détecter les blocs de code
  const codeBlockRegex = /```(?:jsx?|tsx?|html|react|javascript)?\n([\s\S]*?)```/g
  const matches = [...content.matchAll(codeBlockRegex)]

  if (matches.length === 0) return null

  return (
    <div className="space-y-4 mt-4">
      {matches.map((match, index) => {
        const code = match[1].trim()
        const language = detectLanguage(code)
        
        return (
          <CodePreviewButton
            key={index}
            code={code}
            language={language}
            title={`Code ${index + 1}`}
          />
        )
      })}
    </div>
  )
}

function detectLanguage(code: string): "react" | "html" | "vanilla" {
  if (code.includes("import React") || code.includes("export default") || code.includes("useState") || code.includes("<")) {
    if (code.includes("import") || code.includes("export") || code.includes("function") && code.includes("return")) {
      return "react"
    }
  }
  if (code.includes("<!DOCTYPE") || code.includes("<html")) {
    return "html"
  }
  return "vanilla"
}
