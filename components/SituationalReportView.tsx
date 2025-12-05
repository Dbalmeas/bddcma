"use client"

import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { AlertTriangle, TrendingUp, Clock, Radio, MapPin, Target, Zap } from "lucide-react"
import type { SituationalReport } from "@/lib/agent/situational-analysis"
import dynamic from 'next/dynamic'

// Import dynamique pour recharts
const DynamicChart = dynamic(() => import('./DynamicChart'), {
  ssr: false,
})

interface SituationalReportViewProps {
  report: SituationalReport
}

export function SituationalReportView({ report }: SituationalReportViewProps) {
  const { impact, timeline, clusters, sourceAnalysis, keyEntities } = report

  // Couleur du severity level
  const severityColors = {
    low: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
    medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  }

  const severityColor = severityColors[impact.severity.level]

  return (
    <div className="space-y-6">
      {/* Impact Assessment */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-900/70 to-black/50 border-red-500/20">
        <div className="px-6 py-4 border-b border-red-500/10 bg-red-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/15 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Impact Assessment
              </h2>
            </div>
            <Badge className={`${severityColor.bg} ${severityColor.text} ${severityColor.border} px-4 py-1.5 text-sm font-bold uppercase`}>
              {impact.severity.level} ({impact.severity.score}/100)
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Severity Factors */}
          <div>
            <h3 className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
              Key Impact Factors
            </h3>
            <div className="space-y-2">
              {impact.severity.factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/70">{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            {/* Geographical Spread */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
                <MapPin className="h-3 w-3" />
                Geographical Spread
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {impact.geographicalSpread.countriesAffected}
              </div>
              <div className="text-xs text-white/40">
                countries across {impact.geographicalSpread.regionsAffected.length} regions
              </div>
            </div>

            {/* Temporal Density */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                Temporal Density
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {(impact.temporalDensity.eventsPerDay || 0).toFixed(1)}
              </div>
              <div className="text-xs text-white/40">
                events/day · trending {impact.temporalDensity.trend}
              </div>
            </div>

            {/* Information Volume */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
                <Radio className="h-3 w-3" />
                Information Volume
              </div>
              <div className="text-2xl font-bold text-indigo-400">
                {impact.informationVolume.totalSources}
              </div>
              <div className="text-xs text-white/40">
                {impact.informationVolume.newsCount} news · {impact.informationVolume.twitterCount} social
              </div>
            </div>
          </div>

          {/* Peak Activity */}
          {impact.temporalDensity.peakDate && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 uppercase tracking-wider">Peak Activity</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white/80">
                    {new Date(impact.temporalDensity.peakDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-white/40">
                    {impact.temporalDensity.peakCount} events
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Timeline Visualization */}
      {timeline.length > 1 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-blue-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Timeline Analysis
          </h3>
          <DynamicChart
            config={{
              type: 'line',
              title: 'Event Volume Over Time',
              data: timeline.map(point => ({
                name: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: point.count,
                isPeak: point.peakIntensity,
              })),
              xKey: 'name',
              yKey: 'value',
            }}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {timeline.filter(p => p.peakIntensity).map((point, idx) => (
              <Badge key={idx} className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">
                Peak: {new Date(point.date).toLocaleDateString()} ({point.count} events)
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Event Clusters */}
      {clusters.length > 0 && (
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-cyan-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Target className="h-4 w-4 text-cyan-400" />
            Event Clusters ({clusters.length} themes)
          </h3>
          <div className="space-y-3">
            {clusters.slice(0, 10).map((cluster, idx) => (
              <div
                key={cluster.id}
                className="p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/80">{cluster.theme}</span>
                      <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-xs">
                        {cluster.eventCount} events
                      </Badge>
                    </div>
                    {cluster.primaryLocation && (
                      <div className="text-xs text-white/40 mt-1">
                        Primary location: {cluster.primaryLocation}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/30 font-mono">#{idx + 1}</span>
                </div>
                {cluster.dateRange?.start && cluster.dateRange?.end && (
                  <div className="text-xs text-white/40 mb-2">
                    {new Date(cluster.dateRange.start).toLocaleDateString()} →{' '}
                    {new Date(cluster.dateRange.end).toLocaleDateString()}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cluster.keywords?.slice(0, 8).map((keyword, kidx) => (
                    <Badge key={kidx} variant="outline" className="border-white/10 text-white/50 text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Source Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Coverage */}
        <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-sky-500/15">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
            <Radio className="h-4 w-4 text-sky-400" />
            Source Coverage
          </h3>
          <div className="space-y-3">
            {Object.entries(sourceAnalysis.byNetwork).map(([network, stats]) => (
              <div key={network} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white/80 capitalize">{network}</div>
                  <div className="text-xs text-white/40">
                    First: {new Date(stats.firstReport).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-sky-400">{stats.count}</div>
                  {stats.averageDelay > 0 && (
                    <div className="text-xs text-white/40">
                      +{stats.averageDelay}min
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="text-xs text-white/40">
              Total span: {sourceAnalysis.timing.totalSpan} hours
            </div>
          </div>
        </Card>

        {/* Top Locations */}
        {keyEntities.locations.length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-slate-900/50 to-black/30 border-indigo-500/15">
            <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
              <MapPin className="h-4 w-4 text-indigo-400" />
              Key Locations
            </h3>
            <div className="space-y-2">
              {keyEntities.locations.slice(0, 8).map((location, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">{location.name}</span>
                    {location.type === 'inferred' && (
                      <Badge variant="outline" className="border-white/10 text-white/40 text-xs">
                        inferred
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-mono text-white/50">{location.count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
