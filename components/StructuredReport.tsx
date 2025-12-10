"use client"

import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { TrendingUp, MapPin, Calendar, Activity, Globe, Radio, FileText, Code2 } from "lucide-react"
import dynamic from 'next/dynamic'
import { useMemo, useEffect } from "react"
import { Button } from "./ui/button"
import { useCanvas } from "@/contexts/CanvasContext"
import { useTheme } from "next-themes"

// Import dynamique pour recharts
const DynamicChart = dynamic(() => import('./DynamicChart'), {
  ssr: false,
})

// Import dynamique pour le Canvas interactif (Sandpack)
const VisualizationCanvas = dynamic(() => import('./VisualizationCanvas').then(mod => mod.VisualizationCanvas), {
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
            return <span key={i} className="font-semibold" style={{ color: 'var(--primary)' }}>{part.slice(2, -2)}</span>
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <span key={i} className="font-medium" style={{ color: 'var(--secondary)' }}>{part.slice(1, -1)}</span>
          }
          // S'assurer que le texte normal hérite de la couleur foreground
          return <span key={i} style={{ color: 'var(--foreground)' }}>{part}</span>
        })
      }

      if (isListItem) {
        const content = line.trim().slice(1).trim()
        return (
          <li key={idx} className="flex items-start gap-2" style={{ color: 'var(--foreground)', opacity: 1 }}>
            <span className="mt-1" style={{ color: 'var(--primary)' }}>•</span>
            <span style={{ color: 'var(--foreground)', opacity: 1 }}>{formatBold(content)}</span>
          </li>
        )
      }

      // Check if it's a title/header (first line or contains specific patterns)
      const isTitle = idx === 0 || line.includes('(') && line.includes(')') && line.startsWith('**')
      
      if (isTitle && line.startsWith('**')) {
        const titleContent = line.replace(/\*\*/g, '')
        return (
          <h3 key={idx} className="font-semibold text-base mb-3" style={{ color: 'var(--foreground)' }}>
            {titleContent}
          </h3>
        )
      }

      return (
        <p key={idx} className="leading-relaxed mb-2" style={{ color: 'var(--foreground)', opacity: 1 }}>
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
    kpis?: {
      clientConcentrationIndex?: number
      avgTEUPerBooking?: number
      spotVsLongTermMix?: {
        spot: number
        longTerm: number
      }
      commodityMix?: {
        standard: number
        reefer: number
        hazardous: number
        oog: number
      }
    }
  }
  charts?: any[]
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
}

export function StructuredReport({
  summary,
  statistics,
  charts = [],
  proactiveInsights,
  filtersApplied,
  period,
  rowsAnalyzed,
}: StructuredReportProps) {
  const { updateCanvasContent } = useCanvas()
  const { theme, systemTheme } = useTheme()
  
  // Déterminer le thème effectif (light ou dark)
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const isDark = effectiveTheme === 'dark'

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

  // Top 5 trades
  const topTrades = statistics.byTrade
    ? Object.entries(statistics.byTrade)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  // Générer le code HTML du dashboard
  const generateDashboardCode = useMemo(() => {
    const clientsForChart = topClients.map(([name, data]: any) => ({ 
      name: name.slice(0, 20), 
      teu: data.teu, 
      count: data.count 
    }))
    
    const polForChart = topPOL.map(([name, value]) => ({ name, value }))

    // Couleurs basées sur le thème de l'app
    const bgPrimary = isDark ? '#0f172a' : '#f8fafc'
    const bgCard = isDark ? '#1e293b' : '#ffffff'
    const textPrimary = isDark ? '#f1f5f9' : '#1e293b'
    const textSecondary = isDark ? '#94a3b8' : '#64748b'
    const borderColor = isDark ? '#334155' : '#e2e8f0'
    const chartTextColor = isDark ? '#94a3b8' : '#475569'
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.2)'
    const legendColor = isDark ? '#e2e8f0' : '#1e293b'
    const doughnutBorder = isDark ? '#1e293b' : '#ffffff'

    // Build client bars HTML
    const clientBarsHtml = clientsForChart.map((c: any, i: number) => {
      const colors = ['#4a6fa5','#FF4444','#6a8fc5','#ff6666','#8aafdd']
      const percent = ((c.teu / (statistics.totalTEU || 1)) * 100).toFixed(1)
      return '<div class="flex items-center gap-3">' +
        '<div class="w-32 text-sm font-medium truncate" style="color: ' + textSecondary + ';" title="' + c.name + '">' + c.name + '</div>' +
        '<div class="flex-1 rounded-full h-6 overflow-hidden" style="background-color: ' + borderColor + ';">' +
        '<div class="h-full rounded-full flex items-center justify-end pr-2" style="width: ' + percent + '%; background-color: ' + colors[i % colors.length] + ';">' +
        '<span class="text-xs font-bold text-white">' + c.teu.toLocaleString() + ' TEU</span>' +
        '</div></div>' +
        '<div class="w-14 text-right text-sm font-semibold" style="color: ' + textSecondary + ';">' + percent + '%</div>' +
        '</div>'
    }).join('')

    return '<!DOCTYPE html>' +
'<html lang="fr">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>Dashboard</title>' +
'  <script src="https://cdn.tailwindcss.com"><\/script>' +
'  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' +
'  <style>' +
'    body { font-family: "Segoe UI", system-ui, sans-serif; background-color: ' + bgPrimary + '; color: ' + textPrimary + '; }' +
'    .stat-card { transition: transform 0.2s, box-shadow 0.2s; }' +
'    .stat-card:hover { transform: translateY(-2px); }' +
'  </style>' +
'</head>' +
'<body style="background-color: ' + bgPrimary + '; min-height: 100vh; padding: 1.5rem;">' +
'  <div class="max-w-6xl mx-auto">' +
'    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">' +
'      <div class="stat-card rounded-xl p-6 shadow-lg border-l-4" style="background-color: ' + bgCard + '; border-color: #4a6fa5;">' +
'        <div style="color: ' + textSecondary + ';" class="text-sm font-medium mb-1">Total Bookings</div>' +
'        <div style="color: ' + textPrimary + ';" class="text-3xl font-bold">' + statistics.total.toLocaleString() + '</div>' +
'      </div>' +
'      <div class="stat-card rounded-xl p-6 shadow-lg border-l-4" style="background-color: ' + bgCard + '; border-color: #FF4444;">' +
'        <div style="color: ' + textSecondary + ';" class="text-sm font-medium mb-1">Total TEU</div>' +
'        <div style="color: ' + textPrimary + ';" class="text-3xl font-bold">' + (statistics.totalTEU || 0).toLocaleString() + '</div>' +
'      </div>' +
'      <div class="stat-card rounded-xl p-6 shadow-lg border-l-4" style="background-color: ' + bgCard + '; border-color: #6a8fc5;">' +
'        <div style="color: ' + textSecondary + ';" class="text-sm font-medium mb-1">TEU/Booking</div>' +
'        <div style="color: ' + textPrimary + ';" class="text-3xl font-bold">' + (statistics.totalTEU && statistics.total ? (statistics.totalTEU / statistics.total).toFixed(1) : '0') + '</div>' +
'      </div>' +
'    </div>' +
'    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">' +
'      <div class="rounded-xl p-6 shadow-lg" style="background-color: ' + bgCard + ';">' +
'        <h3 style="color: ' + textPrimary + ';" class="text-lg font-semibold mb-4">Top Clients (TEU)</h3>' +
'        <canvas id="clientsChart" height="200"></canvas>' +
'      </div>' +
'      <div class="rounded-xl p-6 shadow-lg" style="background-color: ' + bgCard + ';">' +
'        <h3 style="color: ' + textPrimary + ';" class="text-lg font-semibold mb-4">Detail Clients</h3>' +
'        <div class="space-y-3">' + clientBarsHtml + '</div>' +
'      </div>' +
'    </div>' +
'    <div class="rounded-xl p-6 shadow-lg" style="background-color: ' + bgCard + ';">' +
'      <h3 style="color: ' + textPrimary + ';" class="text-lg font-semibold mb-4">Ports de Chargement</h3>' +
'      <canvas id="portsChart" height="180"></canvas>' +
'    </div>' +
'  </div>' +
'  <script>' +
'    Chart.defaults.color = "' + chartTextColor + '";' +
'    var gridColor = "' + gridColor + '";' +
'    var legendColor = "' + legendColor + '";' +
'    var borderColor = "' + doughnutBorder + '";' +
'    var clientsData = ' + JSON.stringify(clientsForChart) + ';' +
'    var portsData = ' + JSON.stringify(polForChart) + ';' +
'    new Chart(document.getElementById("clientsChart"), {' +
'      type: "bar",' +
'      data: { labels: clientsData.map(function(c) { return c.name; }), datasets: [{ label: "TEU", data: clientsData.map(function(c) { return c.teu; }), backgroundColor: ["#4a6fa5","#FF4444","#6a8fc5","#ff6666","#8aafdd"], borderRadius: 6 }] },' +
'      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: gridColor } }, x: { grid: { display: false } } } }' +
'    });' +
'    new Chart(document.getElementById("portsChart"), {' +
'      type: "doughnut",' +
'      data: { labels: portsData.map(function(p) { return p.name; }), datasets: [{ data: portsData.map(function(p) { return p.value; }), backgroundColor: ["#4a6fa5","#FF4444","#6a8fc5","#ff6666","#8aafdd"], borderWidth: 2, borderColor: borderColor }] },' +
'      options: { responsive: true, plugins: { legend: { position: "right", labels: { color: legendColor } } }, cutout: "60%" }' +
'    });' +
'  <\/script>' +
'</body>' +
'</html>'
  }, [statistics, topClients, topPOL, isDark])

  // Mettre à jour le Canvas avec le dashboard quand les données sont chargées
  useEffect(() => {
    if (statistics && statistics.total > 0) {
      updateCanvasContent({
        code: generateDashboardCode,
        title: "Dashboard CMA CGM",
        language: "html"
      })
    }
  }, [statistics, generateDashboardCode, updateCanvasContent])

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
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)', opacity: 1 }}>Executive Summary</h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6" style={{ color: 'var(--foreground)' }}>
          <FormattedSummary text={summary} />
          
          {/* Quick Stats Bar - Shipping Metrics */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-2 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                  {statistics.total.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider mt-0.5 sm:mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Bookings
                </div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--secondary)' }}>
                  {statistics.totalTEU ? statistics.totalTEU.toLocaleString() : '0'}
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider mt-0.5 sm:mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Total TEU
                </div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                  {statistics.byClient ? Object.keys(statistics.byClient).length : 0}
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider mt-0.5 sm:mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Clients
                </div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                  {statistics.byPOL ? Object.keys(statistics.byPOL).length : 0}
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider mt-0.5 sm:mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Ports (POL)
                </div>
              </div>
            </div>
            {filtersApplied && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <strong>Filtres appliques:</strong> {filtersApplied.status?.join(', ') || 'Aucun'}
                  {filtersApplied.dateRange && (" - Periode: " + filtersApplied.dateRange.start + " - " + filtersApplied.dateRange.end)}
                  {rowsAnalyzed && (" - Lignes analysees: " + rowsAnalyzed.toLocaleString())}
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
                              {anomaly.deviation && (" - Ecart: " + (anomaly.deviation > 0 ? "+" : "") + anomaly.deviation.toFixed(1) + "%")}
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

      {/* Key Statistics Shipping */}
      <div>
        <h3 className="text-xs font-semibold mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'var(--primary)' }} />
          Statistiques Clés
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Total Bookings */}
          <Card className="p-3 sm:p-4 md:p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: 'var(--primary)',
          }}>
            <div className="text-[10px] sm:text-xs mb-1 sm:mb-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Total Bookings</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: 'var(--primary)' }}>
              {(statistics.totalCount || statistics.total).toLocaleString()}
            </div>
          </Card>

          {/* Total TEU */}
          {statistics.totalTEU !== undefined && (
            <Card className="p-3 sm:p-4 md:p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--secondary)',
            }}>
              <div className="text-[10px] sm:text-xs mb-1 sm:mb-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Total TEU</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: 'var(--secondary)' }}>
                {Math.round(statistics.totalTEU).toLocaleString()}
              </div>
            </Card>
          )}

          {/* Date Range */}
          {statistics.dateRange && (
            <Card className="p-3 sm:p-4 md:p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--primary)',
            }}>
              <div className="text-[10px] sm:text-xs mb-1 sm:mb-2 flex items-center gap-1 sm:gap-1.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ color: 'var(--primary)' }} />
                Période
              </div>
              <div className="text-[11px] sm:text-xs md:text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {new Date(statistics.dateRange.start).toLocaleDateString('fr-FR', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="text-[10px] sm:text-xs my-0.5 sm:my-1" style={{ color: 'var(--muted-foreground)' }}>au</div>
              <div className="text-[11px] sm:text-xs md:text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {new Date(statistics.dateRange.end).toLocaleDateString('fr-FR', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </Card>
          )}

          {/* Unique Clients */}
          {statistics.byClient && (
            <Card className="p-3 sm:p-4 md:p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--secondary)',
            }}>
              <div className="text-[10px] sm:text-xs mb-1 sm:mb-2 flex items-center gap-1 sm:gap-1.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ color: 'var(--secondary)' }} />
                Clients Uniques
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: 'var(--secondary)' }}>
                {Object.keys(statistics.byClient).length}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* KPIs Métier Shipping */}
      {statistics.kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Concentration Client */}
          <Card className="p-5 border" style={{
            background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
            borderColor: statistics.kpis.clientConcentrationIndex && statistics.kpis.clientConcentrationIndex > 40 ? 'var(--destructive)' : 'var(--primary)',
          }}>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              Concentration Client
            </h3>
            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              {statistics.kpis.clientConcentrationIndex?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Top 5 clients / Volume total
            </p>
            <Badge className="mt-3" style={{
              backgroundColor: statistics.kpis.clientConcentrationIndex && statistics.kpis.clientConcentrationIndex > 40 
                ? 'var(--destructive)' 
                : statistics.kpis.clientConcentrationIndex && statistics.kpis.clientConcentrationIndex < 10
                ? 'var(--primary)'
                : 'var(--secondary)',
              color: 'var(--primary-foreground)',
            }}>
              {statistics.kpis.clientConcentrationIndex && statistics.kpis.clientConcentrationIndex > 40 
                ? '⚠️ Risque élevé' 
                : statistics.kpis.clientConcentrationIndex && statistics.kpis.clientConcentrationIndex < 10
                ? '✅ Excellente diversification'
                : '✅ Diversification saine'}
            </Badge>
          </Card>

          {/* Mix Spot vs Long-Term */}
          {statistics.kpis.spotVsLongTermMix && (
            <Card className="p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--secondary)',
            }}>
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                <Activity className="h-4 w-4" style={{ color: 'var(--secondary)' }} />
                Mix Commercial
              </h3>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Spot</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                    {statistics.kpis.spotVsLongTermMix.spot.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Long-Term</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                    {statistics.kpis.spotVsLongTermMix.longTerm.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Badge style={{
                backgroundColor: statistics.kpis.spotVsLongTermMix.spot > 60 
                  ? 'var(--destructive)' 
                  : 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}>
                {statistics.kpis.spotVsLongTermMix.spot > 60 
                  ? '⚠️ Volatilité élevée' 
                  : '✅ Mix équilibré'}
              </Badge>
            </Card>
          )}

          {/* Mix Marchandises */}
          {statistics.kpis.commodityMix && (
            <Card className="p-5 border" style={{
              background: 'linear-gradient(to bottom right, var(--card), var(--muted))',
              borderColor: 'var(--primary)',
            }}>
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                <Database className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                Mix Marchandises
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Standard</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {statistics.kpis.commodityMix.standard.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Reefer</span>
                  <span className="text-sm font-semibold" style={{ color: statistics.kpis.commodityMix.reefer > 10 ? 'var(--destructive)' : 'var(--foreground)' }}>
                    {statistics.kpis.commodityMix.reefer.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Hazardous</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {statistics.kpis.commodityMix.hazardous.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Out of Gauge</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {statistics.kpis.commodityMix.oog.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
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

      {/* Interactive Canvas Mode */}
      {statistics && statistics.total > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
            <Code2 className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            Mode Canvas Interactif
          </h3>
          <VisualizationCanvas
            statistics={statistics}
            charts={charts}
            title="Dashboard Interactif"
          />
        </div>
      )}
    </div>
  )
}
