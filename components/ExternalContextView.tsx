"use client"

import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Globe2, BookOpen, MapPin, Shield, Info } from "lucide-react"
import type { ExternalContext } from "@/lib/agent/context-gathering"

interface ExternalContextViewProps {
  context: ExternalContext
}

export function ExternalContextView({ context }: ExternalContextViewProps) {
  const { entities, historicalContext, geographicContext, technicalContext, summary } = context

  // Protection contre les valeurs undefined
  const safeEntities = entities || []
  const safeHistoricalContext = historicalContext || []
  const safeGeographicContext = geographicContext || []
  const safeTechnicalContext = technicalContext || []
  const safeSummary = summary || { totalEntities: 0, criticalRegions: 0, emergingThreats: 0 }

  // Couleurs pour les niveaux de risque
  const getRiskColor = (level: string) => {
    if (level === 'critical') return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' }
    if (level === 'high') return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' }
    if (level === 'medium') return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' }
    return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' }
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-900/70 to-black/50 border-blue-500/20">
        <div className="px-6 py-4 border-b border-blue-500/10 bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/15 rounded-lg">
                <Globe2 className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                External Context & Intelligence
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{safeSummary.totalEntities}</div>
              <div className="text-xs text-white/40 mt-1">Key Entities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">{safeSummary.criticalRegions}</div>
              <div className="text-xs text-white/40 mt-1">Critical Regions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{safeSummary.emergingThreats}</div>
              <div className="text-xs text-white/40 mt-1">Emerging Threats</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Entities */}
      {safeEntities.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-indigo-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Info className="h-4 w-4 text-indigo-400" />
            Key Entities ({safeEntities.length})
          </h3>
          <div className="space-y-3">
            {safeEntities.map((entity, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-indigo-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white/80">{entity.entity}</span>
                      <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-xs capitalize">
                        {entity.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">{entity.description}</p>
                  </div>
                  <Badge className="bg-white/5 text-white/60 border-white/10 ml-3">
                    {((entity.relevance || 0) * 100).toFixed(0)}% relevance
                  </Badge>
                </div>

                {entity.additionalInfo?.region && (
                  <div className="mt-2 text-xs">
                    <span className="text-white/40">Region: </span>
                    <span className="text-white/70">{entity.additionalInfo.region}</span>
                  </div>
                )}

                {entity.additionalInfo?.knownFor && entity.additionalInfo.knownFor.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-white/40 mb-1">Notable for:</p>
                    <div className="flex flex-wrap gap-1">
                      {entity.additionalInfo.knownFor.slice(0, 5).map((item, kidx) => (
                        <Badge key={kidx} variant="outline" className="border-white/10 text-white/40 text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-xs text-white/30 italic">
                    Sources: {entity.sources.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Geographic Context */}
      {safeGeographicContext.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-green-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <MapPin className="h-4 w-4 text-green-400" />
            Geographic Intelligence ({safeGeographicContext.length} regions)
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {safeGeographicContext.map((geo, idx) => {
              const riskColor = getRiskColor(geo.riskLevel)

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-green-500/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white/80">{geo.country}</h4>
                    <Badge className={`${riskColor.bg} ${riskColor.text} ${riskColor.border} text-xs capitalize`}>
                      {geo.riskLevel} risk
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-white/40">Region: </span>
                      <span className="text-white/70">{geo.region}</span>
                    </div>

                    {geo.neighbors.length > 0 && (
                      <div>
                        <span className="text-white/40">Neighbors: </span>
                        <span className="text-white/70">{geo.neighbors.join(', ')}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-white/40 mb-1">Economic Status:</p>
                      <p className="text-white/60">{geo.economicStatus}</p>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-white/40 mb-1">Political Situation:</p>
                      <p className="text-white/60">{geo.politicalSituation}</p>
                    </div>

                    {geo.activeConflicts.length > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-white/40 mb-1">Active Conflicts:</p>
                        {geo.activeConflicts.map((conflict, cidx) => (
                          <Badge key={cidx} className="bg-red-500/15 text-red-400 border-red-500/30 mr-1 mb-1 text-xs">
                            {conflict}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Technical Context / Cyber Threats */}
      {safeTechnicalContext.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-red-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Shield className="h-4 w-4 text-red-400" />
            Technical Threats & Cyber Intelligence ({safeTechnicalContext.length} identified)
          </h3>
          <div className="space-y-3">
            {safeTechnicalContext.map((tech, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-red-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white/80">{tech.technology}</span>
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">
                        {tech.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">{tech.description}</p>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/40 ml-3">
                    {tech.relatedIncidents} incidents
                  </Badge>
                </div>

                {tech.securityImplications.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-2">Security Implications:</p>
                    <ul className="space-y-1">
                      {tech.securityImplications.map((implication, iidx) => (
                        <li key={iidx} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="text-red-400 mt-0.5">⚠</span>
                          <span>{implication}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historical Context */}
      {safeHistoricalContext.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-amber-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <BookOpen className="h-4 w-4 text-amber-400" />
            Historical Context ({safeHistoricalContext.length} topics)
          </h3>
          <div className="space-y-3">
            {safeHistoricalContext.map((hist, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white/80">{hist.topic}</h4>
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                    {hist.relatedEvents} events
                  </Badge>
                </div>

                <p className="text-xs text-white/50 mb-3">{hist.description}</p>

                <div className="mb-3 pt-3 border-t border-white/5">
                  <p className="text-xs font-semibold text-amber-400 mb-1">Significance:</p>
                  <p className="text-xs text-white/60">{hist.significance}</p>
                </div>

                {hist.timeline.length > 0 && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-2">Recent Timeline:</p>
                    <div className="space-y-2">
                      {hist.timeline.map((item, tidx) => (
                        <div key={tidx} className="flex items-start gap-2 text-xs">
                          <span className="text-amber-400 font-mono">{item.date}</span>
                          <span className="text-white/60">{item.event}</span>
                        </div>
                      ))}
                    </div>
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
