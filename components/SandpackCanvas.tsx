"use client"

import { useState, useCallback, useMemo } from "react"
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
  SandpackConsole,
} from "@codesandbox/sandpack-react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { 
  Code2, 
  Play, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check,
  Terminal,
  RefreshCw,
  X
} from "lucide-react"

interface SandpackCanvasProps {
  code: string
  language?: "react" | "vanilla" | "vue" | "html"
  title?: string
  showCode?: boolean
  showPreview?: boolean
  height?: string
  theme?: "light" | "dark" | "auto"
  onClose?: () => void
}

// Composant pour les contrôles internes de Sandpack
function SandpackControls({ onRefresh }: { onRefresh: () => void }) {
  const { sandpack } = useSandpack()
  
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="h-7 w-7 p-0"
        title="Rafraîchir la preview"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function SandpackCanvas({
  code,
  language = "react",
  title = "Preview",
  showCode: initialShowCode = true,
  showPreview: initialShowPreview = true,
  height = "400px",
  theme = "auto",
  onClose,
}: SandpackCanvasProps) {
  const [showCode, setShowCode] = useState(initialShowCode)
  const [showPreview, setShowPreview] = useState(initialShowPreview)
  const [showConsole, setShowConsole] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [key, setKey] = useState(0)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleRefresh = useCallback(() => {
    setKey(prev => prev + 1)
  }, [])

  // Déterminer le thème Sandpack basé sur le thème système
  const sandpackTheme = useMemo(() => {
    if (theme === "auto") {
      if (typeof window !== "undefined") {
        return document.documentElement.classList.contains("dark") ? "dark" : "light"
      }
      return "dark"
    }
    return theme
  }, [theme])

  // Configuration des fichiers selon le langage
  const files = useMemo((): Record<string, string> => {
    if (language === "react") {
      return {
        "/App.js": code,
        "/index.js": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);`,
        "/styles.css": `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  padding: 20px;
  background: #f5f5f5;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h1, h2, h3 {
  margin-bottom: 16px;
  color: #333;
}

p {
  margin-bottom: 12px;
  color: #666;
  line-height: 1.6;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #0066cc;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #0052a3;
}

.chart-container {
  width: 100%;
  height: 300px;
  margin: 20px 0;
}
`,
      }
    }

    if (language === "html" || language === "vanilla") {
      return {
        "/index.html": code.includes("<!DOCTYPE") ? code : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; padding: 20px; }
  </style>
</head>
<body>
${code}
</body>
</html>`,
      }
    }

    return {
      "/App.js": code,
    }
  }, [code, language])

  // Template selon le langage
  const template = language === "html" || language === "vanilla" ? "static" : "react"

  return (
    <Card 
      className={`overflow-hidden border-2 transition-all duration-300 ${
        isFullscreen 
          ? "fixed inset-4 z-50 m-0" 
          : ""
      }`}
      style={{
        borderColor: 'var(--primary)',
        background: 'var(--card)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ 
          borderColor: 'var(--border)',
          background: 'var(--muted)',
        }}
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {title}
          </span>
          <span 
            className="text-xs px-2 py-0.5 rounded"
            style={{ 
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            {language.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className={`h-7 px-2 text-xs ${showCode ? 'bg-primary/20' : ''}`}
            title={showCode ? "Masquer le code" : "Afficher le code"}
          >
            <Code2 className="h-3.5 w-3.5 mr-1" />
            Code
          </Button>

          {/* Toggle Preview */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={`h-7 px-2 text-xs ${showPreview ? 'bg-primary/20' : ''}`}
            title={showPreview ? "Masquer la preview" : "Afficher la preview"}
          >
            {showPreview ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
            Preview
          </Button>

          {/* Toggle Console */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
            className={`h-7 px-2 text-xs ${showConsole ? 'bg-primary/20' : ''}`}
            title={showConsole ? "Masquer la console" : "Afficher la console"}
          >
            <Terminal className="h-3.5 w-3.5 mr-1" />
            Console
          </Button>

          {/* Copy */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
            title="Copier le code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7 p-0"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Close */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-red-500/20"
              title="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Sandpack Content */}
      <div style={{ height: isFullscreen ? "calc(100% - 44px)" : height }}>
        <SandpackProvider
          key={key}
          template={template as any}
          files={files}
          theme={sandpackTheme}
          options={{
            externalResources: [
              "https://cdn.jsdelivr.net/npm/chart.js",
              "https://cdn.tailwindcss.com",
            ],
            recompileMode: "delayed",
            recompileDelay: 500,
          }}
        >
          <SandpackLayout style={{ height: "100%", border: "none" }}>
            {showCode && (
              <SandpackCodeEditor
                showTabs
                showLineNumbers
                showInlineErrors
                wrapContent
                style={{ 
                  height: "100%",
                  flex: showPreview ? 1 : 2,
                }}
              />
            )}
            {showPreview && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Preview</span>
                  <SandpackControls onRefresh={handleRefresh} />
                </div>
                <SandpackPreview
                  showNavigator={false}
                  showRefreshButton={false}
                  style={{ flex: 1 }}
                />
                {showConsole && (
                  <SandpackConsole
                    style={{ height: "120px", borderTop: "1px solid var(--border)" }}
                  />
                )}
              </div>
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </Card>
  )
}

// Utilitaire pour détecter si un texte contient du code React/HTML
export function detectCodeLanguage(code: string): "react" | "html" | "vanilla" {
  if (code.includes("import React") || code.includes("export default") || code.includes("useState") || code.includes("useEffect")) {
    return "react"
  }
  if (code.includes("<!DOCTYPE") || code.includes("<html") || code.includes("<body")) {
    return "html"
  }
  if (code.includes("<script>") || code.includes("document.")) {
    return "vanilla"
  }
  return "react"
}

// Utilitaire pour extraire le code d'un bloc markdown
export function extractCodeFromMarkdown(text: string): { code: string; language: string } | null {
  const codeBlockRegex = /```(?:jsx?|tsx?|html|react)?\n([\s\S]*?)```/
  const match = text.match(codeBlockRegex)
  
  if (match) {
    return {
      code: match[1].trim(),
      language: detectCodeLanguage(match[1]),
    }
  }
  
  return null
}
