"use client"

import { AlertTriangle, TrendingDown, TrendingUp, AlertCircle, Info } from "lucide-react"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"

export interface Anomaly {
  type: 'spike' | 'drop' | 'trend' | 'warning' | 'info'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  value?: string
  comparison?: string
  recommendation?: string
}

interface AnomalyAlertProps {
  anomalies: Anomaly[]
  className?: string
}

export function AnomalyAlert({ anomalies, className }: AnomalyAlertProps) {
  if (!anomalies || anomalies.length === 0) {
    return null
  }

  const getIcon = (type: Anomaly['type']) => {
    switch (type) {
      case 'spike':
        return <TrendingUp className="h-5 w-5" />
      case 'drop':
        return <TrendingDown className="h-5 w-5" />
      case 'trend':
        return <TrendingUp className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'info':
        return <Info className="h-5 w-5" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-500/50 bg-red-500/10 text-red-400'
      case 'medium':
        return 'border-orange-500/50 bg-orange-500/10 text-orange-400'
      case 'low':
        return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
      default:
        return 'border-blue-500/50 bg-blue-500/10 text-blue-400'
    }
  }

  const getBadgeVariant = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold">Anomalies détectées ({anomalies.length})</h3>
      </div>

      {anomalies.map((anomaly, index) => (
        <Card
          key={index}
          className={cn(
            "p-4 border-2 transition-all hover:scale-[1.02]",
            getSeverityColor(anomaly.severity)
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {getIcon(anomaly.type)}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm">{anomaly.title}</h4>
                <Badge variant={getBadgeVariant(anomaly.severity)} className="text-xs">
                  {anomaly.severity.toUpperCase()}
                </Badge>
              </div>

              <p className="text-sm opacity-90">{anomaly.description}</p>

              {anomaly.value && (
                <div className="flex items-center gap-2 text-sm font-mono bg-black/20 rounded px-2 py-1">
                  <span className="opacity-70">Valeur:</span>
                  <span className="font-bold">{anomaly.value}</span>
                  {anomaly.comparison && (
                    <span className="opacity-70 ml-1">({anomaly.comparison})</span>
                  )}
                </div>
              )}

              {anomaly.recommendation && (
                <div className="mt-2 p-2 bg-white/5 rounded text-xs border border-white/10">
                  <div className="flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 shrink-0 opacity-70" />
                    <span className="opacity-80">{anomaly.recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
