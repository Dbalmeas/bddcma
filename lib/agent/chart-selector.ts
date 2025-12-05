/**
 * Chart Selector - Sélection automatique du type de graphique selon le type d'analyse
 * Respecte les critères CMA CGM pour la qualité des visualisations
 */

import { ParsedQuery } from './query-parser'

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'map'

export interface ChartRecommendation {
  type: ChartType
  title: string
  rationale: string
  dataKey?: string
  xKey?: string
  yKey?: string
}

/**
 * Détermine le type de graphique optimal selon le type d'analyse demandée
 * Mapping basé sur les critères CMA CGM (Critère 3 - Qualité des Visualisations)
 */
export function selectChartType(
  parsed: ParsedQuery,
  aggregations?: any[],
  statistics?: any
): ChartRecommendation[] {
  const recommendations: ChartRecommendation[] = []
  const metric = parsed.aggregation?.metric || 'teu'
  const groupBy = parsed.aggregation?.groupBy

  // 1. ÉVOLUTION TEMPORELLE → Line Chart
  if (groupBy === 'date' || parsed.filters?.dateRange) {
    if (aggregations && aggregations.length > 0) {
      recommendations.push({
        type: 'line',
        title: `Évolution du Volume ${metric.toUpperCase()} dans le Temps`,
        rationale: 'Visualisation des tendances temporelles',
        xKey: 'date',
        yKey: metric,
        dataKey: 'date',
      })
    }
  }

  // 2. COMPARAISON DE CATÉGORIES → Bar Chart
  if (groupBy === 'client' || groupBy === 'pol' || groupBy === 'pod') {
    if (aggregations && aggregations.length > 0) {
      const labels: Record<string, string> = {
        client: 'Client',
        pol: 'Port de Chargement (POL)',
        pod: 'Port de Déchargement (POD)',
      }
      recommendations.push({
        type: 'bar',
        title: `Top 10 ${labels[groupBy]} par Volume ${metric.toUpperCase()}`,
        rationale: 'Comparaison de valeurs entre groupes',
        xKey: 'key',
        yKey: metric,
        dataKey: 'key',
      })
    }
  }

  // 3. RÉPARTITION / PROPORTION → Pie Chart ou Treemap
  if (groupBy === 'trade' || groupBy === 'commodity' || groupBy === 'status') {
    if (aggregations && aggregations.length > 0 && aggregations.length <= 10) {
      const labels: Record<string, string> = {
        trade: 'Route Commerciale',
        commodity: 'Type de Marchandise',
        status: 'Statut',
      }
      recommendations.push({
        type: 'pie',
        title: `Répartition par ${labels[groupBy]}`,
        rationale: 'Visualisation des parts d\'un tout',
        dataKey: 'value',
      })
    }
  }

  // 4. GÉOGRAPHIE → Map Chart (si données géographiques disponibles)
  if (groupBy === 'pol' || groupBy === 'pod' || parsed.filters?.pol || parsed.filters?.pod) {
    if (statistics?.byPOL || statistics?.byPOD) {
      recommendations.push({
        type: 'map',
        title: 'Distribution Géographique des Flux',
        rationale: 'Analyse des données géolocalisées',
        dataKey: 'country',
      })
    }
  }

  // 5. CORRÉLATION / DISTRIBUTION → Scatter Plot ou Histogram
  // Si on compare deux métriques (ex: poids vs TEU)
  if (metric === 'weight' && parsed.aggregation) {
    recommendations.push({
      type: 'scatter',
      title: 'Corrélation Poids / Volume TEU',
      rationale: 'Identification de relations entre variables',
      xKey: 'teu',
      yKey: 'weight',
    })
  }

  // Graphiques automatiques basés sur les statistiques disponibles
  if (statistics) {
    // Top clients par volume
    if (statistics.byClient && Object.keys(statistics.byClient).length > 0) {
      const topClients = Object.entries(statistics.byClient)
        .sort(([, a]: any, [, b]: any) => (b.teu || 0) - (a.teu || 0))
        .slice(0, 10)

      if (topClients.length > 0 && topClients.some(([, data]: any) => (data.teu || 0) > 0)) {
        recommendations.push({
          type: 'bar',
          title: 'Top 10 Clients par Volume TEU',
          rationale: 'Comparaison des volumes par client',
          xKey: 'name',
          yKey: 'teu',
        })
      }
    }

    // Distribution par route commerciale
    if (statistics.byTrade && Object.keys(statistics.byTrade).length > 0) {
      const trades = Object.entries(statistics.byTrade)
      if (trades.length <= 8) {
        recommendations.push({
          type: 'pie',
          title: 'Distribution par Route Commerciale',
          rationale: 'Répartition des flux par route',
          dataKey: 'value',
        })
      }
    }
  }

  // Si aucune recommandation spécifique, utiliser un graphique par défaut
  if (recommendations.length === 0 && aggregations && aggregations.length > 0) {
    recommendations.push({
      type: 'bar',
      title: `Volume ${metric.toUpperCase()} par ${groupBy || 'Catégorie'}`,
      rationale: 'Visualisation par défaut',
      xKey: 'key',
      yKey: metric,
    })
  }

  return recommendations
}

/**
 * Formate les données pour le graphique selon le type recommandé
 */
export function formatChartData(
  recommendation: ChartRecommendation,
  aggregations: any[],
  statistics?: any
): any[] {
  const { type, xKey, yKey, dataKey } = recommendation

  if (type === 'line' && xKey === 'date') {
    return aggregations
      .slice(0, 30)
      .map((item: any) => ({
        date: item.key,
        [yKey || 'value']: item[yKey || 'teu'] || item.count || 0,
      }))
  }

  if (type === 'bar') {
    return aggregations
      .slice(0, 10)
      .map((item: any) => ({
        name: item.key?.length > 20 ? item.key.substring(0, 20) + '...' : item.key,
        fullName: item.key,
        [yKey || 'value']: item[yKey || 'teu'] || item.count || 0,
      }))
  }

  if (type === 'pie') {
    return aggregations
      .slice(0, 8)
      .map((item: any) => ({
        name: item.key?.length > 30 ? item.key.substring(0, 30) + '...' : item.key,
        fullName: item.key,
        value: item[dataKey || 'teu'] || item.count || 0,
      }))
  }

  return aggregations.map((item: any) => ({
    ...item,
    [xKey || 'key']: item.key,
    [yKey || 'value']: item[yKey || 'teu'] || item.count || 0,
  }))
}

