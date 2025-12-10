"use client"

import { useState, useRef } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  Area,
  AreaChart,
} from 'recharts'
import { Button } from './ui/button'
import { Download, ZoomIn, ZoomOut } from 'lucide-react'

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  title: string
  data: any[]
  xKey?: string
  yKey?: string | string[]  // Support pour barres groupées
  dataKey?: string
  rationale?: string
}

interface DynamicChartProps {
  config: ChartConfig
}

// CMA CGM Official Color Palette (optimisé mode sombre)
const COLORS = [
  '#4a6fa5', // Bleu CMA CGM clair (lisible en sombre)
  '#FF4444', // Rouge CMA CGM vif
  '#6a8fc5', // Bleu plus clair
  '#ff6666', // Rouge clair
  '#8aafdd', // Bleu très clair
  '#ff8888', // Rouge très clair
  '#3a5f95', // Bleu moyen
  '#cc3333', // Rouge foncé
  '#5a7fb5', // Bleu lumineux
  '#ee5555', // Rouge lumineux
]

const tooltipStyle = {
  backgroundColor: 'rgba(10, 20, 40, 0.95)',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  padding: '12px',
}

// Tooltip personnalisé avec plus d'informations
const CustomTooltip = ({ active, payload, label, dataKey }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div style={tooltipStyle}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#fff' }}>
          {label || data.name || data.fullName || data.key}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
            {entry.name || entry.dataKey}: <span style={{ fontWeight: 'bold' }}>
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                : entry.value}
            </span>
          </p>
        ))}
        {data.fullName && data.fullName !== label && (
          <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
            {data.fullName}
          </p>
        )}
        {data.bookingCount && (
          <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
            {data.bookingCount} booking{data.bookingCount > 1 ? 's' : ''}
          </p>
        )}
      </div>
    )
  }
  return null
}

export default function DynamicChart({ config }: DynamicChartProps) {
  const { type, data, xKey, yKey, title, rationale } = config
  const chartRef = useRef<HTMLDivElement>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-white/40">
        No data available for visualization
      </div>
    )
  }

  // Fonction d'export PNG (avec fallback si html2canvas n'est pas disponible)
  const handleExportPNG = async () => {
    if (!chartRef.current) return
    
    try {
      // Essayer d'importer html2canvas dynamiquement
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${(title || 'chart').replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`
      link.href = url
      link.click()
    } catch (error) {
      console.error('Export PNG failed:', error)
      // Fallback: exporter les données en JSON
      const jsonData = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${(title || 'chart').replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  // Line Chart avec interactivité améliorée
  if (type === 'line' && xKey && yKey) {
    return (
      <div ref={chartRef} className="space-y-2">
        <div className="flex items-center justify-between">
          {rationale && (
            <p className="text-xs text-muted-foreground italic">{rationale}</p>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportPNG}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            PNG
          </Button>
        </div>
        <ResponsiveContainer width="100%" height={isZoomed ? 500 : 300}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a6fa5" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#4a6fa5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 140, 200, 0.15)" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="rgba(255, 255, 255, 0.2)"
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="rgba(255, 255, 255, 0.2)" 
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} 
            tickLine={false}
            axisLine={false}
              tickFormatter={(value) => value.toLocaleString('fr-FR')}
          />
            <Tooltip content={<CustomTooltip />} />
            <Brush dataKey={xKey} height={30} stroke="#4a6fa5" />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#4a6fa5"
            strokeWidth={2.5}
            dot={{ fill: '#4a6fa5', strokeWidth: 2, stroke: '#4a6fa5', r: 4 }}
            activeDot={{ r: 6, fill: '#FF4444', stroke: '#4a6fa5' }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    )
  }

  // Bar Chart avec interactivité améliorée (supporte barres groupées)
  if (type === 'bar' && xKey && yKey) {
    const isMultipleBars = Array.isArray(yKey)
    const barKeys = isMultipleBars ? yKey : [yKey]
    const barColors = ['#4a6fa5', '#FF4444', '#6a8fc5', '#ff6666', '#8aafdd']
    
    return (
      <div ref={chartRef} className="space-y-2">
        <div className="flex items-center justify-between">
          {rationale && (
            <p className="text-xs text-muted-foreground italic">{rationale}</p>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportPNG}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            PNG
          </Button>
        </div>
        <ResponsiveContainer width="100%" height={isZoomed ? 500 : 300}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGradientDynamic" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#3a5f95" stopOpacity={1}/>
              <stop offset="100%" stopColor="#6a8fc5" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="barGradientRed" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#cc3333" stopOpacity={1}/>
              <stop offset="100%" stopColor="#FF4444" stopOpacity={1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 140, 200, 0.15)" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="rgba(255, 255, 255, 0.2)"
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="rgba(255, 255, 255, 0.2)" 
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }} 
            tickLine={false}
            axisLine={false}
              tickFormatter={(value) => value.toLocaleString('fr-FR')}
          />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
            {isMultipleBars && <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />}
            {barKeys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={barColors[index % barColors.length]}
                radius={[4, 4, 0, 0]} 
                animationDuration={500}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
      </div>
    )
  }

  // Pie Chart avec interactivité améliorée
  if (type === 'pie') {
    return (
      <div ref={chartRef} className="space-y-2">
        <div className="flex items-center justify-between">
          {rationale && (
            <p className="text-xs text-muted-foreground italic">{rationale}</p>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportPNG}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            PNG
          </Button>
        </div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <defs>
            {COLORS.map((color, index) => (
              <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1}/>
                <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            stroke="rgba(0, 0, 0, 0.3)"
            strokeWidth={1}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
              animationDuration={500}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
            <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-[300px] flex items-center justify-center text-sm text-white/40">
      Unsupported chart type: {type}
    </div>
  )
}
