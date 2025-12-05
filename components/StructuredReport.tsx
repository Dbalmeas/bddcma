"use client"

import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { TrendingUp, MapPin, Calendar, Activity, Database, Globe, Radio, FileText } from "lucide-react"
import dynamic from 'next/dynamic'
import { useState, useMemo } from "react"
import { Button } from "./ui/button"
import { DataTable } from "./DataTable"
import { SituationalReportView } from "./SituationalReportView"
import { NarrativeAnalysisView } from "./NarrativeAnalysisView"
import { PatternAnalysisView } from "./PatternAnalysisView"
import { ExternalContextView } from "./ExternalContextView"
import type { SituationalReport } from "@/lib/agent/situational-analysis"
import type { NarrativeAnalysis } from "@/lib/agent/narrative-analysis"
import type { PatternAnalysis } from "@/lib/agent/pattern-detection"
import type { ExternalContext } from "@/lib/agent/context-gathering"

// Import dynamique pour recharts
const DynamicChart = dynamic(() => import('./DynamicChart'), {
  ssr: false,
})

// Function to render markdown-like text with proper formatting
function FormattedSummary({ text }: { text: string }) {
  const formattedContent = useMemo(() => {
    // Split by lines
    const lines = text.split('\n').filter(line => line.trim())
    
    return lines.map((line, idx) => {
      // Check if it's a list item
      const isListItem = line.trim().startsWith('-') || line.trim().startsWith('•')
      
      // Format bold text (**text** or *text*)
      const formatBold = (str: string) => {
        // Replace **text** with styled span
        return str.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="text-blue-400 font-semibold">{part.slice(2, -2)}</span>
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <span key={i} className="text-cyan-400 font-medium">{part.slice(1, -1)}</span>
          }
          return part
        })
      }

      if (isListItem) {
        const content = line.trim().slice(1).trim()
        return (
          <li key={idx} className="flex items-start gap-2 text-white/60">
            <span className="text-blue-400 mt-1">•</span>
            <span>{formatBold(content)}</span>
          </li>
        )
      }

      // Check if it's a title/header (first line or contains specific patterns)
      const isTitle = idx === 0 || line.includes('(') && line.includes(')') && line.startsWith('**')
      
      if (isTitle && line.startsWith('**')) {
        const titleContent = line.replace(/\*\*/g, '')
        return (
          <h3 key={idx} className="text-white/90 font-semibold text-base mb-3">
            {titleContent}
          </h3>
        )
      }

      return (
        <p key={idx} className="text-white/60 leading-relaxed mb-2">
          {formatBold(line)}
        </p>
      )
    })
  }, [text])

  return <div className="space-y-1">{formattedContent}</div>
}

interface StructuredReportProps {
  summary: string
  statistics: {
    total: number
    totalCount?: number
    totalTEU?: number
    totalUnits?: number
    totalWeight?: number
    dateRange?: {
      start: string
      end: string
    }
    byClient?: Record<string, { count: number; teu: number }>
    byPOL?: Record<string, number>
    byPOD?: Record<string, number>
    byTrade?: Record<string, number>
    // Legacy support
    byCountry?: Record<string, number>
    byEventType?: Record<string, number>
    byNetwork?: Record<string, number>
  }
  charts?: any[]
  rawData?: any[]
  proactiveInsights?: {
    anomalies?: Array<{
      type: string
      severity: 'low' | 'medium' | 'high'
      description: string
      metric?: string
      value?: number
      expected?: number
      deviation?: number
    }>
    patterns?: Array<{
      type: string
      description: string
      confidence: number
    }>
    recommendations?: Array<{
      type: string
      priority: 'low' | 'medium' | 'high'
      description: string
      action?: string
    }>
  }
  filtersApplied?: any
  period?: { start: string; end: string }
  rowsAnalyzed?: number
  // Legacy support
  notableEvents?: any[]
  situationalReport?: SituationalReport
  narrativeAnalysis?: NarrativeAnalysis
  patternAnalysis?: PatternAnalysis
  externalContext?: ExternalContext
}

export function StructuredReport({
  summary,
  statistics,
  charts = [],
  rawData = [],
  proactiveInsights,
  filtersApplied,
  period,
  rowsAnalyzed,
  // Legacy support
  notableEvents = [],
  situationalReport,
  narrativeAnalysis,
  patternAnalysis,
  externalContext,
}: StructuredReportProps) {
  const [showRawData, setShowRawData] = useState(false)

  // Top 5 clients (shipping data)
  const topClients = statistics.byClient
    ? Object.entries(statistics.byClient)
        .sort(([, a]: any, [, b]: any) => (b.teu || 0) - (a.teu || 0))
        .slice(0, 5)
    : []

  // Top 5 POL (Ports of Loading)
  const topPOL = statistics.byPOL
    ? Object.entries(statistics.byPOL)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  // Top 5 POD (Ports of Discharge)
  const topPOD = statistics.byPOD
    ? Object.entries(statistics.byPOD)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  // Legacy support for events
  const topCountries = Object.entries(statistics.byCountry || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const topEventTypes = Object.entries(statistics.byEventType || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const networkData = Object.entries(statistics.byNetwork || {})

  // Top 5 notable events
  const displayNotableEvents = (notableEvents || rawData).slice(0, 5)

  // Max values for progress bars
  const maxCountryCount = topCountries[0]?.[1] || 1
  const maxEventTypeCount = topEventTypes[0]?.[1] || 1

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="overflow-hidden border" style={{
        background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
        borderColor: 'var(--primary)',
      }}>
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{
          borderColor: 'var(--primary)',
          backgroundColor: 'var(--muted)',
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{
              backgroundColor: 'var(--primary)',
              opacity: 0.2,
            }}>
              <FileText className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>Executive Summary</h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <FormattedSummary text={summary} />
          
          {/* Quick Stats Bar - Shipping Metrics */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                  {statistics.total.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Bookings
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--secondary)' }}>
                  {statistics.totalTEU ? statistics.totalTEU.toLocaleString() : '0'}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Total TEU
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                  {statistics.byClient ? Object.keys(statistics.byClient).length : 0}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Clients
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                  {statistics.byPOL ? Object.keys(statistics.byPOL).length : 0}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Ports (POL)
                </div>
              </div>
            </div>
            {filtersApplied && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <strong>Filtres appliqués:</strong> {filtersApplied.status?.join(', ') || 'Aucun'}
                  {filtersApplied.dateRange && ` • Période: ${filtersApplied.dateRange.start} → ${filtersApplied.dateRange.end}`}
                  {rowsAnalyzed && ` • Lignes analysées: ${rowsAnalyzed.toLocaleString()}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Proactive Insights - Anomalies, Patterns, Recommendations */}
      {proactiveInsights && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
            Insights Proactifs
          </h2>
          
          {/* Anomalies */}
          {proactiveInsights.anomalies && proactiveInsights.anomalies.length > 0 && (
            <Card className="border-2" style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--secondary)'
            }}>
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--secondary)' }}>
                  Anomalies Détectées
                </h3>
                <div className="space-y-2">
                  {proactiveInsights.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="p-3 rounded border" style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: anomaly.severity === 'high' ? 'var(--destructive)' : 'var(--border)'
                    }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {anomaly.description}
                          </p>
                          {anomaly.metric && (
                            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                              {anomaly.metric}: {anomaly.value?.toLocaleString()} (attendu: {anomaly.expected?.toLocaleString()})
                              {anomaly.deviation && ` • Écart: ${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%`}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={anomaly.severity === 'high' ? 'destructive' : anomaly.severity === 'medium' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {anomaly.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Patterns */}
          {proactiveInsights.patterns && proactiveInsights.patterns.length > 0 && (
            <Card className="border" style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}>
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>
                  Patterns Identifiés
                </h3>
                <div className="space-y-2">
                  {proactiveInsights.patterns.map((pattern, idx) => (
                    <div key={idx} className="p-3 rounded border" style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: 'var(--border)'
                    }}>
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                        {pattern.description}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        Confiance: {(pattern.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {proactiveInsights.recommendations && proactiveInsights.recommendations.length > 0 && (
            <Card className="border-2" style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--primary)'
            }}>
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>
                  Recommandations Business
                </h3>
                <div className="space-y-2">
                  {proactiveInsights.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded border" style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: rec.priority === 'high' ? 'var(--primary)' : 'var(--border)'
                    }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {rec.description}
                          </p>
                          {rec.action && (
                            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                              Action suggérée: {rec.action}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={rec.priority === 'high' ? 'default' : rec.priority === 'medium' ? 'secondary' : 'outline'}
                          className="ml-2"
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Legacy: Situational Report - Advanced Analysis */}
      {situationalReport && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Situational Analysis
          </h2>
          <SituationalReportView report={situationalReport} />
        </div>
      )}

      {/* Narrative Analysis */}
      {narrativeAnalysis && (
        <div className="space-y-4 mt-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Narrative & Framing Analysis
          </h2>
          <NarrativeAnalysisView analysis={narrativeAnalysis} />
        </div>
      )}

      {/* Pattern Analysis */}
      {patternAnalysis && (
        <div className="space-y-4 mt-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Pattern & Trend Detection
          </h2>
          <PatternAnalysisView analysis={patternAnalysis} />
        </div>
      )}

      {/* External Context */}
      {externalContext && (
        <div className="space-y-4 mt-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            External Context & Intelligence
          </h2>
          <ExternalContextView context={externalContext} />
        </div>
      )}

      {/* Key Statistics */}
      <div>
        <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          <Activity className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          Key Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Events */}
          <Card className="p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: 'var(--primary)',
          }}>
            <div className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Total Events</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>{statistics.total.toLocaleString()}</div>
          </Card>

          {/* Date Range */}
          {statistics.dateRange && (
            <Card className="p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--primary)',
            }}>
              <div className="text-xs mb-2 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                <Calendar className="h-3 w-3" style={{ color: 'var(--primary)' }} />
                Date Range
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {new Date(statistics.dateRange.start).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="text-xs my-1" style={{ color: 'var(--muted-foreground)' }}>to</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {new Date(statistics.dateRange.end).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </Card>
          )}

          {/* Countries */}
          <Card className="p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: 'var(--primary)',
          }}>
            <div className="text-xs mb-2 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              <Globe className="h-3 w-3" style={{ color: 'var(--primary)' }} />
              Countries
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
              {Object.keys(statistics.byCountry || {}).length}
            </div>
          </Card>

          {/* Event Types */}
          <Card className="p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: 'var(--secondary)',
          }}>
            <div className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Event Types</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--secondary)' }}>
              {Object.keys(statistics.byEventType || {}).length}
            </div>
          </Card>
        </div>
      </div>

      {/* Top Countries & Event Types Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Countries */}
        {topCountries.length > 0 && (
          <Card className="p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: 'var(--primary)',
          }}>
            <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              <Globe className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              Top Countries
            </h3>
            <div className="space-y-3">
              {topCountries.map(([country, count], idx) => (
                <div key={country} className="flex items-center gap-3">
                  <div className="text-xs w-6 font-mono" style={{ color: 'var(--muted-foreground)' }}>#{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{country}</span>
                      <span className="text-sm font-mono" style={{ color: 'var(--muted-foreground)' }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxCountryCount) * 100}%`,
                          background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top Event Types */}
        {topEventTypes.length > 0 && (
          <Card className="p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: 'var(--secondary)',
          }}>
            <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              <Activity className="h-4 w-4" style={{ color: 'var(--secondary)' }} />
              Top Event Types
            </h3>
            <div className="space-y-3">
              {topEventTypes.map(([type, count], idx) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="text-xs w-6 font-mono" style={{ color: 'var(--muted-foreground)' }}>#{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{type}</span>
                      <span className="text-sm font-mono" style={{ color: 'var(--muted-foreground)' }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxEventTypeCount) * 100}%`,
                          background: 'linear-gradient(to right, var(--secondary), var(--primary))',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Network Distribution */}
      {networkData.length > 0 && (
        <Card className="p-5 border" style={{
          background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
          borderColor: 'var(--primary)',
        }}>
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
            <Radio className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            Source Distribution
          </h3>
          <div className="flex flex-wrap gap-4">
            {networkData.map(([network, count], idx) => {
              const isPrimary = idx % 2 === 0
              return (
                <div key={network} className="flex items-center gap-2.5">
                  <Badge className="px-3 py-1 border" style={{
                    backgroundColor: isPrimary ? 'var(--primary)' : 'var(--secondary)',
                    borderColor: isPrimary ? 'var(--primary)' : 'var(--secondary)',
                    color: 'var(--primary-foreground)',
                    opacity: 0.2,
                  }}>
                    {network}
                  </Badge>
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{count}</span>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    ({(statistics.total ? ((count / statistics.total) * 100).toFixed(1) : '0.0')}%)
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Charts */}
      {charts && charts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            Visual Analysis
          </h3>
          {charts.map((chart, i) => (
            <Card key={i} className="p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--primary)',
            }}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{chart.title}</h4>
              <DynamicChart config={chart} />
            </Card>
          ))}
        </div>
      )}

      {/* Notable Events */}
      {displayNotableEvents.length > 0 && (
        <Card className="p-5 border" style={{
          background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
          borderColor: 'var(--primary)',
        }}>
          <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>Notable Events</h3>
          <div className="space-y-3">
            {displayNotableEvents.map((event, idx) => (
              <div
                key={event.id || idx}
                className="p-4 rounded-lg border transition-all"
                style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-foreground)' }}>#{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--foreground)' }}>{event.text}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" style={{
                        borderColor: 'var(--border)',
                        color: 'var(--muted-foreground)',
                      }}>
                        {new Date(event.publish_date).toLocaleDateString()}
                      </Badge>
                      {event.event_labels?.[0]?.value && (
                        <Badge style={{
                          backgroundColor: 'var(--primary)',
                          borderColor: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          opacity: 0.2,
                        }}>
                          {event.event_labels[0].value}
                        </Badge>
                      )}
                      {event.event_locations?.[0]?.country && (
                        <Badge style={{
                          backgroundColor: 'var(--secondary)',
                          borderColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          opacity: 0.2,
                        }}>
                          {event.event_locations[0].country}
                        </Badge>
                      )}
                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)' }}
                          className="hover:opacity-80 transition-opacity"
                        >
                          View source →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Raw Data Access */}
      {rawData && rawData.length > 0 && (
        <div>
          <Button
            onClick={() => setShowRawData(!showRawData)}
            className="mb-4 border"
            style={{
              backgroundColor: 'var(--muted)',
              borderColor: 'var(--primary)',
              color: 'var(--foreground)',
            }}
          >
            <Database className="h-4 w-4 mr-2" style={{ color: 'var(--primary)' }} />
            {showRawData ? 'Hide' : 'Show'} Raw Data ({rawData.length} events)
          </Button>

          {showRawData && <DataTable data={rawData} title="Complete Event Data" />}
        </div>
      )}
    </div>
  )
}
