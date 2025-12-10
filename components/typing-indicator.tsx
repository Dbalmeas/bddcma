"use client"

import { Card } from "./ui/card"
import { Bot, Sparkles } from "lucide-react"

export function TypingIndicator() {
  return (
    <>
      <div className="flex justify-start">
        <Card 
          className="p-4 border rounded-xl shadow-sm typing-indicator-card" 
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            maxWidth: '85%',
          }}
        >
          <div className="flex items-start gap-3">
            {/* Avatar avec animation */}
            <div className="flex-shrink-0 mt-1">
              <div className="relative">
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center typing-bot-icon"
                  style={{
                    backgroundColor: 'var(--primary)',
                  }}
                >
                  <Bot className="h-4 w-4" style={{ color: 'var(--primary-foreground)' }} />
                </div>
                <div 
                  className="absolute inset-0 rounded-full typing-ping"
                  style={{
                    backgroundColor: 'var(--primary)',
                  }}
                />
              </div>
            </div>

            {/* Message avec animation */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                  IA CMA CGM
                </span>
                <Sparkles className="h-3 w-3 typing-sparkle" style={{ color: 'var(--primary)' }} />
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Analyse de votre requête
                </span>
                <div className="flex gap-1 ml-2 typing-dots">
                  <span className="typing-dot typing-dot-1" />
                  <span className="typing-dot typing-dot-2" />
                  <span className="typing-dot typing-dot-3" />
                </div>
              </div>

              {/* Barre de progression animée */}
              <div className="mt-3 h-1 rounded-full overflow-hidden typing-progress-bar" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-full rounded-full typing-progress-fill" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .typing-bot-icon {
          animation: typing-pulse 2s ease-in-out infinite;
        }

        .typing-ping {
          opacity: 0.75;
          animation: typing-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .typing-sparkle {
          animation: typing-pulse 1.5s ease-in-out infinite;
        }

        .typing-dot {
          display: inline-block;
          height: 6px;
          width: 6px;
          border-radius: 50%;
          background-color: var(--muted-foreground);
          opacity: 0.7;
        }

        .typing-dot-1 {
          animation: typing-bounce 1.4s ease-in-out infinite;
        }

        .typing-dot-2 {
          animation: typing-bounce 1.4s ease-in-out infinite;
          animation-delay: 0.2s;
        }

        .typing-dot-3 {
          animation: typing-bounce 1.4s ease-in-out infinite;
          animation-delay: 0.4s;
        }

        .typing-progress-fill {
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          width: 100%;
          animation: typing-shimmer 2s ease-in-out infinite;
        }

        @keyframes typing-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes typing-ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes typing-bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        @keyframes typing-shimmer {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </>
  )
}

