"use client"

import { useMemo } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Code2, BarChart3, PieChart, Sparkles, ExternalLink } from "lucide-react"
import { useCanvas } from "@/contexts/CanvasContext"

interface VisualizationCanvasProps {
  statistics: {
    total: number
    totalTEU?: number
    byClient?: Record<string, { count: number; teu: number }>
    byPOL?: Record<string, number>
    byPOD?: Record<string, number>
    byTrade?: Record<string, number>
    dateRange?: { start: string; end: string }
  }
  charts?: any[]
  title?: string
}

export function VisualizationCanvas({ statistics, charts = [], title = "Dashboard Interactif" }: VisualizationCanvasProps) {
  const { openCanvas } = useCanvas()

  // Générer le code HTML pour la visualisation
  const generateDashboardCode = useMemo(() => {
    const topClients = statistics.byClient
      ? Object.entries(statistics.byClient)
          .sort(([, a], [, b]) => (b.teu || 0) - (a.teu || 0))
          .slice(0, 5)
          .map(([name, data]) => ({ name: name.slice(0, 20), teu: data.teu, count: data.count }))
      : []

    const topPOL = statistics.byPOL
      ? Object.entries(statistics.byPOL)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }))
      : []

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard CMA CGM</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; }
    .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen p-6">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">📊 Dashboard CMA CGM</h1>
      <p class="text-gray-600">Analyse des données de shipping - Premier semestre 2020</p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="stat-card bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
        <div class="text-gray-500 text-sm font-medium mb-1">Total Bookings</div>
        <div class="text-3xl font-bold text-gray-800">${statistics.total.toLocaleString()}</div>
        <div class="text-green-600 text-sm mt-2">📦 Réservations actives</div>
      </div>
      <div class="stat-card bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
        <div class="text-gray-500 text-sm font-medium mb-1">Total TEU</div>
        <div class="text-3xl font-bold text-gray-800">${(statistics.totalTEU || 0).toLocaleString()}</div>
        <div class="text-blue-600 text-sm mt-2">🚢 Volume conteneurs</div>
      </div>
      <div class="stat-card bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-500">
        <div class="text-gray-500 text-sm font-medium mb-1">TEU/Booking</div>
        <div class="text-3xl font-bold text-gray-800">${statistics.totalTEU && statistics.total ? (statistics.totalTEU / statistics.total).toFixed(1) : '0'}</div>
        <div class="text-purple-600 text-sm mt-2">📈 Moyenne par réservation</div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Bar Chart -->
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">🏢 Top 5 Clients (TEU)</h3>
        <canvas id="clientsChart" height="200"></canvas>
      </div>

      <!-- Pie Chart -->
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">🚢 Répartition par Port (POL)</h3>
        <canvas id="portsChart" height="200"></canvas>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white rounded-xl p-6 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">📋 Détail des Clients</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="pb-3 text-gray-600 font-medium">Client</th>
              <th class="pb-3 text-gray-600 font-medium text-right">Bookings</th>
              <th class="pb-3 text-gray-600 font-medium text-right">TEU</th>
              <th class="pb-3 text-gray-600 font-medium text-right">% Total</th>
            </tr>
          </thead>
          <tbody>
            ${topClients.map((client, i) => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
              <td class="py-3 font-medium text-gray-800">${client.name}</td>
              <td class="py-3 text-right text-gray-600">${client.count.toLocaleString()}</td>
              <td class="py-3 text-right text-gray-800 font-semibold">${client.teu.toLocaleString()}</td>
              <td class="py-3 text-right">
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  ${((client.teu / (statistics.totalTEU || 1)) * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-8 text-center text-gray-500 text-sm">
      Généré par CMA CGM Talk to Data • ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>

  <script>
    // Données
    const clientsData = ${JSON.stringify(topClients)};
    const portsData = ${JSON.stringify(topPOL)};

    // Bar Chart - Clients
    new Chart(document.getElementById('clientsChart'), {
      type: 'bar',
      data: {
        labels: clientsData.map(c => c.name),
        datasets: [{
          label: 'TEU',
          data: clientsData.map(c => c.teu),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(236, 72, 153, 0.8)'
          ],
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    // Pie Chart - Ports
    new Chart(document.getElementById('portsChart'), {
      type: 'doughnut',
      data: {
        labels: portsData.map(p => p.name),
        datasets: [{
          data: portsData.map(p => p.value),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(236, 72, 153, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { usePointStyle: true, padding: 15 }
          }
        },
        cutout: '60%'
      }
    });
  </script>
</body>
</html>`
  }, [statistics])

  const handleOpenCanvas = () => {
    openCanvas({
      code: generateDashboardCode,
      title: "Dashboard CMA CGM",
      language: "html"
    })
  }

  return (
    <Card className="p-4 border-2 border-dashed hover:border-solid transition-all cursor-pointer group" 
      style={{ borderColor: 'var(--primary)' }}
      onClick={handleOpenCanvas}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--primary)', opacity: 0.2 }}>
            <Sparkles className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors" style={{ color: 'var(--foreground)' }}>
              Ouvrir le Canvas Interactif
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Dashboard avec graphiques, tableaux et KPIs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <BarChart3 className="h-4 w-4" />
            <PieChart className="h-4 w-4" />
          </div>
          <Button
            className="gap-2 group-hover:scale-105 transition-transform"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <Code2 className="h-4 w-4" />
            Ouvrir
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
