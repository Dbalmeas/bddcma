"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { MapPin, TrendingUp, TrendingDown } from "lucide-react"

export interface GeoData {
  country: string
  countryCode: string
  value: number
  percentage: number
  trend?: 'up' | 'down' | 'stable'
  coordinates?: { lat: number; lng: number }
}

interface GeographicHeatmapProps {
  data: GeoData[]
  title?: string
  metric?: string
  className?: string
}

export function GeographicHeatmap({ data, title = "Distribution géographique", metric = "TEU", className }: GeographicHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredCountry, setHoveredCountry] = useState<GeoData | null>(null)

  // Trier les données par valeur décroissante
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 15)
  const maxValue = Math.max(...sortedData.map(d => d.value))

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Simple world map visualization using bars for now
    // In production, this would use a proper map library like react-simple-maps or leaflet
    const barHeight = 30
    const spacing = 10
    const padding = 20

    sortedData.forEach((country, index) => {
      const y = padding + (barHeight + spacing) * index
      const barWidth = (country.value / maxValue) * (canvas.width - padding * 2)

      // Gradient bar
      const gradient = ctx.createLinearGradient(padding, y, padding + barWidth, y)
      gradient.addColorStop(0, '#00458C')
      gradient.addColorStop(1, '#0066CC')

      ctx.fillStyle = gradient
      ctx.fillRect(padding, y, barWidth, barHeight)

      // Country name
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'
      ctx.fillText(country.country, padding + 5, y + 18)

      // Value
      ctx.font = 'bold 12px sans-serif'
      const valueText = `${country.value.toLocaleString('fr-FR')} ${metric}`
      ctx.fillText(valueText, padding + barWidth - ctx.measureText(valueText).width - 5, y + 18)
    })
  }, [sortedData, maxValue, metric])

  return (
    <Card className={`p-6 bg-zinc-900/50 border-white/10 ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#00458C]" />
            <h3 className="font-semibold">{title}</h3>
          </div>
          <Badge variant="outline" className="font-mono">
            {sortedData.length} pays
          </Badge>
        </div>

        {/* Canvas visualization */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={Math.min(sortedData.length * 40 + 40, 600)}
            className="w-full rounded-lg bg-black/20"
            style={{ maxHeight: '600px' }}
          />
        </div>

        {/* Data table */}
        <div className="mt-6 space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold opacity-70 px-2">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Pays</div>
            <div className="col-span-3 text-right">Volume ({metric})</div>
            <div className="col-span-2 text-right">Part</div>
            <div className="col-span-1"></div>
          </div>

          {sortedData.map((country, index) => (
            <div
              key={country.countryCode}
              className="grid grid-cols-12 gap-2 p-2 rounded hover:bg-white/5 transition-colors text-sm"
              onMouseEnter={() => setHoveredCountry(country)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              <div className="col-span-1 font-mono opacity-50">
                {index + 1}
              </div>
              <div className="col-span-5 font-medium flex items-center gap-2">
                <span className="text-2xl" title={country.country}>
                  {getFlagEmoji(country.countryCode)}
                </span>
                {country.country}
              </div>
              <div className="col-span-3 text-right font-mono">
                {country.value.toLocaleString('fr-FR')}
              </div>
              <div className="col-span-2 text-right opacity-70">
                {country.percentage.toFixed(1)}%
              </div>
              <div className="col-span-1 flex justify-end">
                {country.trend === 'up' && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                {country.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {hoveredCountry && (
          <div className="fixed bottom-4 right-4 p-4 bg-zinc-900 border border-white/20 rounded-lg shadow-xl z-50 min-w-[200px]">
            <div className="text-lg font-bold">{hoveredCountry.country}</div>
            <div className="text-2xl text-[#00458C] font-mono mt-1">
              {hoveredCountry.value.toLocaleString('fr-FR')} {metric}
            </div>
            <div className="text-sm opacity-70 mt-1">
              {hoveredCountry.percentage.toFixed(2)}% du total
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍'

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))

  return String.fromCodePoint(...codePoints)
}
