"use client"

import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Clock, AlertTriangle, GitBranch, TrendingUp, Globe, Zap } from "lucide-react"
import type { PatternAnalysis } from "@/lib/agent/pattern-detection"

interface PatternAnalysisViewProps {
  analysis: PatternAnalysis
}

export function PatternAnalysisView({ analysis }: PatternAnalysisViewProps) {
  const { temporalPatterns, anomalies, similarEventClusters, trendPredictions, geographicPatterns, summary } = analysis

  // Protection contre les valeurs undefined
  const safeTemporalPatterns = temporalPatterns || []
  const safeAnomalies = anomalies || []
  const safeSimilarEventClusters = similarEventClusters || []
  const safeTrendPredictions = trendPredictions || []
  const safeGeographicPatterns = geographicPatterns || []
  const safeSummary = summary || { totalPatternsDetected: 0, criticalAnomalies: 0, emergingTrends: 0 }

  // Couleurs pour la sévérité des anomalies
  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' }
    if (severity === 'medium') return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' }
    return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' }
  }

  // Couleurs pour les tendances
  const getTrendColor = (trend: string) => {
    if (trend === 'increasing') return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', icon: '↗' }
    if (trend === 'decreasing') return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: '↘' }
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: '→' }
  }

  // Couleurs pour les patterns temporels
  const getFrequencyColor = (frequency: string) => {
    if (frequency === 'daily') return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' }
    if (frequency === 'weekly') return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' }
    if (frequency === 'sporadic') return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' }
    return { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' }
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-900/70 to-black/50 border-emerald-500/20">
        <div className="px-6 py-4 border-b border-emerald-500/10 bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/15 rounded-lg">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Pattern & Trend Analysis
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{safeSummary.totalPatternsDetected}</div>
              <div className="text-xs text-white/40 mt-1">Patterns Detected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{safeSummary.criticalAnomalies}</div>
              <div className="text-xs text-white/40 mt-1">Critical Anomalies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{safeSummary.emergingTrends}</div>
              <div className="text-xs text-white/40 mt-1">Emerging Trends</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Temporal Patterns */}
      {safeTemporalPatterns.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-purple-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Clock className="h-4 w-4 text-purple-400" />
            Temporal Patterns ({safeTemporalPatterns.length} detected)
          </h3>
          <div className="space-y-3">
            {safeTemporalPatterns.slice(0, 8).map((pattern, idx) => {
              const freqColor = getFrequencyColor(pattern.frequency)

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-purple-500/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white/80">{pattern.eventType}</span>
                        <Badge className={`${freqColor.bg} ${freqColor.text} ${freqColor.border} text-xs capitalize`}>
                          {pattern.frequency}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50">{pattern.description}</p>
                    </div>
                    <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 ml-3">
                      {((pattern.confidence || 0) * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">Occurrences:</span>
                      <span className="text-white/70 font-mono">{pattern.occurrences}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">Avg Interval:</span>
                      <span className="text-white/70 font-mono">{(pattern.avgInterval || 0).toFixed(1)} days</span>
                    </div>
                  </div>

                  {pattern.predictedNext && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-purple-400">
                        Next predicted: {new Date(pattern.predictedNext).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Anomalies */}
      {safeAnomalies.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-red-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Anomalies Detected ({safeAnomalies.length} found)
          </h3>
          <div className="space-y-3">
            {safeAnomalies.slice(0, 10).map((anomaly, idx) => {
              const sevColor = getSeverityColor(anomaly.severity)

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/50 rounded-lg border border-white/5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white/80 capitalize">{anomaly.type.replace('_', ' ')}</span>
                        <Badge className={`${sevColor.bg} ${sevColor.text} ${sevColor.border} text-xs capitalize`}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50">{anomaly.description}</p>
                    </div>
                  </div>

                  {anomaly.date && (
                    <div className="mt-2 text-xs text-white/40">
                      Date: {new Date(anomaly.date).toLocaleDateString()}
                    </div>
                  )}

                  {anomaly.eventType && (
                    <div className="mt-1 text-xs text-white/40">
                      Event Type: {anomaly.eventType}
                    </div>
                  )}

                  {anomaly.location && (
                    <div className="mt-1 text-xs text-white/40">
                      Location: {anomaly.location}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Similar Event Clusters */}
      {safeSimilarEventClusters.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-cyan-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <GitBranch className="h-4 w-4 text-cyan-400" />
            Similar Event Clusters ({safeSimilarEventClusters.length} clusters)
          </h3>
          <div className="space-y-3">
            {safeSimilarEventClusters.slice(0, 8).map((cluster, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                      {cluster.events?.length || 0} events
                    </Badge>
                    <span className="text-xs text-white/40">
                      Similarity: {((cluster.similarity || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {cluster.events?.slice(0, 3).map((event, eidx) => (
                    <div key={eidx} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/50">{new Date(event.publish_date).toLocaleDateString()}</span>
                        <Badge variant="outline" className="border-white/10 text-white/40">
                          {event.network}
                        </Badge>
                      </div>
                      <p className="text-white/70 line-clamp-2">{event.text}</p>
                    </div>
                  ))}
                  {(cluster.events?.length || 0) > 3 && (
                    <p className="text-xs text-white/40 italic">
                      +{(cluster.events?.length || 0) - 3} more similar events
                    </p>
                  )}
                </div>

                {cluster.commonKeywords?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-1">Common keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {cluster.commonKeywords.slice(0, 10).map((keyword, kidx) => (
                        <Badge key={kidx} variant="outline" className="border-white/10 text-white/40 text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trend Predictions */}
      {safeTrendPredictions.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-green-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Trend Predictions ({safeTrendPredictions.length} trends)
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {safeTrendPredictions.slice(0, 8).map((prediction, idx) => {
              const trendColor = getTrendColor(prediction.trend)

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-green-500/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white/80">{prediction.eventType}</h4>
                    <Badge className={`${trendColor.bg} ${trendColor.text} ${trendColor.border} text-xs`}>
                      {trendColor.icon} {prediction.trend}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/40">Current rate:</span>
                      <span className="text-white/70 font-mono">{(prediction.currentRate || 0).toFixed(1)}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Predicted rate:</span>
                      <span className="text-white/70 font-mono">{(prediction.predictedRate || 0).toFixed(1)}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Confidence:</span>
                      <span className="text-white/70 font-mono">{((prediction.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/50">{prediction.rationale}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Geographic Patterns */}
      {safeGeographicPatterns.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-blue-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Globe className="h-4 w-4 text-blue-400" />
            Geographic Patterns ({safeGeographicPatterns.length} patterns)
          </h3>
          <div className="space-y-3">
            {safeGeographicPatterns.slice(0, 8).map((pattern, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-blue-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white/80 mb-1">{pattern.eventType}</h4>
                    <p className="text-xs text-white/50">{pattern.description}</p>
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 ml-3">
                    {pattern.countries.length} countries
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {pattern.countries.map((country, cidx) => (
                    <Badge key={cidx} variant="outline" className="border-white/10 text-white/50 text-xs">
                      {country}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">Occurrences:</span>
                    <span className="text-white/70 font-mono">{pattern.occurrences}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">Correlation:</span>
                    <span className="text-white/70 font-mono">{((pattern.correlation || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {pattern.timelag && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-blue-400">
                      Sequential pattern detected (avg timelag: {(pattern.timelag || 0).toFixed(1)} days)
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
