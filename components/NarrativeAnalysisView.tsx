"use client"

import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { MessageSquare, TrendingUp, GitCompare, Hash, Sparkles, BookOpen } from "lucide-react"
import type { NarrativeAnalysis } from "@/lib/agent/narrative-analysis"

interface NarrativeAnalysisViewProps {
  analysis: NarrativeAnalysis
}

export function NarrativeAnalysisView({ analysis }: NarrativeAnalysisViewProps) {
  const { overallSentiment, framingPatterns, narrativeDivergences, thematicClusters, keyNarratives } = analysis

  // Protection contre les valeurs undefined
  const safeOverallSentiment = overallSentiment || { score: 0, confidence: 0, indicators: [] }
  const safeFramingPatterns = framingPatterns || []
  const safeNarrativeDivergences = narrativeDivergences || []
  const safeThematicClusters = thematicClusters || []
  const safeKeyNarratives = keyNarratives || []

  // Couleurs pour le sentiment
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', label: 'Positive' }
    if (score < -0.3) return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Negative' }
    return { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Neutral' }
  }

  const sentimentColor = getSentimentColor(safeOverallSentiment.score)

  // Couleurs pour l'évolution
  const getEvolutionColor = (evolution: string) => {
    if (evolution === 'emerging') return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', icon: '↗' }
    if (evolution === 'declining') return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', icon: '↘' }
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: '→' }
  }

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-900/70 to-black/50 border-purple-500/20">
        <div className="px-6 py-4 border-b border-purple-500/10 bg-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/15 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Narrative & Framing Analysis
              </h2>
            </div>
            <Badge className={`${sentimentColor.bg} ${sentimentColor.text} ${sentimentColor.border} px-4 py-1.5 text-sm font-bold uppercase`}>
              {sentimentColor.label} Sentiment
            </Badge>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white/70">Overall Sentiment Score</h3>
              <p className="text-xs text-white/40 mt-1">
                Based on analysis of {safeOverallSentiment.indicators.length} sentiment indicators
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{
                color: safeOverallSentiment.score > 0 ? 'rgb(74, 222, 128)' : safeOverallSentiment.score < 0 ? 'rgb(248, 113, 113)' : 'rgb(156, 163, 175)'
              }}>
                {(safeOverallSentiment.score || 0).toFixed(2)}
              </div>
              <div className="text-xs text-white/40 mt-1">
                Confidence: {((safeOverallSentiment.confidence || 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Sentiment indicators */}
          {safeOverallSentiment.indicators.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Key Indicators
              </h4>
              <div className="flex flex-wrap gap-2">
                {safeOverallSentiment.indicators.slice(0, 15).map((indicator, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={`border-white/10 text-xs ${
                      indicator.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {indicator}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Framing Patterns */}
      {safeFramingPatterns.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-cyan-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Hash className="h-4 w-4 text-cyan-400" />
            Framing Patterns ({safeFramingPatterns.length} detected)
          </h3>
          <div className="space-y-3">
            {safeFramingPatterns.slice(0, 8).map((pattern, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white/80 capitalize">{pattern.pattern}</span>
                      <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-xs">
                        {pattern.frequency} uses
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">{pattern.description}</p>
                  </div>
                </div>

                {/* Source distribution */}
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">News:</span>
                    <span className="text-white/70 font-mono">{pattern.sources?.news || 0}</span>
                    <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${((pattern.sources?.news || 0) / (pattern.frequency || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">Twitter:</span>
                    <span className="text-white/70 font-mono">{pattern.sources?.twitter || 0}</span>
                    <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${((pattern.sources?.twitter || 0) / (pattern.frequency || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Examples */}
                {pattern.examples?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/40 italic">
                      "{pattern.examples[0]}..."
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Narrative Divergences */}
      {safeNarrativeDivergences.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-orange-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <GitCompare className="h-4 w-4 text-orange-400" />
            Narrative Divergences ({safeNarrativeDivergences.length} found)
          </h3>
          <div className="space-y-4">
            {safeNarrativeDivergences.slice(0, 5).map((divergence, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white/80">{divergence.topic}</h4>
                  <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">
                    {((divergence.divergenceScore || 0) * 100).toFixed(0)}% divergence
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* News Framing */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">
                        News
                      </Badge>
                      <span className="text-xs text-white/50 capitalize">{divergence.newsFraming?.tone || 'neutral'} tone</span>
                    </div>
                    {divergence.newsFraming?.focusAreas?.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Focus areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {divergence.newsFraming.focusAreas.map((area, i) => (
                            <Badge key={i} variant="outline" className="border-white/10 text-white/50 text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Twitter Framing */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-xs">
                        Twitter
                      </Badge>
                      <span className="text-xs text-white/50 capitalize">{divergence.twitterFraming?.tone || 'neutral'} tone</span>
                    </div>
                    {divergence.twitterFraming?.focusAreas?.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Focus areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {divergence.twitterFraming.focusAreas.map((area, i) => (
                            <Badge key={i} variant="outline" className="border-white/10 text-white/50 text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Thematic Clusters */}
      {safeThematicClusters.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-indigo-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Thematic Clusters ({safeThematicClusters.length} themes)
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {safeThematicClusters.slice(0, 10).map((cluster, idx) => {
              const evolutionColor = getEvolutionColor(cluster.evolution)
              const sentColor = getSentimentColor(cluster.sentiment?.score || 0)

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-indigo-500/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white/80">{cluster.theme}</h4>
                    <Badge className={`${evolutionColor.bg} ${evolutionColor.text} ${evolutionColor.border} text-xs`}>
                      {evolutionColor.icon} {cluster.evolution}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-white/40">Events:</span>
                      <span className="text-white/70 font-mono">{cluster.eventCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/40">Source:</span>
                      <span className="text-white/70 capitalize">{cluster.dominantSource}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${sentColor.bg} ${sentColor.text} ${sentColor.border} text-xs`}>
                      Sentiment: {(cluster.sentiment?.score || 0).toFixed(2)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {cluster.keywords?.slice(0, 8).map((keyword, kidx) => (
                      <Badge key={kidx} variant="outline" className="border-white/10 text-white/40 text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Key Narratives */}
      {safeKeyNarratives.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-purple-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <BookOpen className="h-4 w-4 text-purple-400" />
            Key Narratives
          </h3>
          <div className="space-y-3">
            {safeKeyNarratives.map((narrative, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-purple-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-white/80 flex-1">{narrative.narrative}</p>
                  <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 ml-3">
                    {narrative.supportingEvents} events
                  </Badge>
                </div>
                {narrative.timespan?.start && narrative.timespan?.end && (
                  <p className="text-xs text-white/40">
                    {new Date(narrative.timespan.start).toLocaleDateString()} → {new Date(narrative.timespan.end).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
