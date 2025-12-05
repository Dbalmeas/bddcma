/**
 * Situational Analysis - Génère des rapports situationnels détaillés
 * avec timeline, impact assessment, et clustering d'événements
 */

export interface TimelinePoint {
  date: string
  count: number
  events: string[] // IDs
  peakIntensity: boolean // True si pic d'activité détecté
}

export interface ImpactAssessment {
  geographicalSpread: {
    countriesAffected: number
    regionsAffected: string[]
    primaryLocations: Array<{ country: string; count: number }>
  }
  temporalDensity: {
    eventsPerDay: number
    peakDate: string
    peakCount: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  informationVolume: {
    totalSources: number
    newsCount: number
    twitterCount: number
    averageSourcesPerDay: number
  }
  severity: {
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    score: number // 0-100
  }
}

export interface EventCluster {
  id: string
  theme: string
  eventIds: string[]
  eventCount: number
  dateRange: { start: string; end: string }
  primaryLocation?: string
  keywords: string[]
}

export interface SourceAnalysis {
  byNetwork: Record<string, {
    count: number
    firstReport: string
    lastReport: string
    averageDelay: number // Minutes from first mention
  }>
  coverage: {
    newsOnly: number
    twitterOnly: number
    both: number
  }
  timing: {
    firstMention: string
    lastMention: string
    totalSpan: number // Hours
  }
}

export interface SituationalReport {
  timeline: TimelinePoint[]
  impact: ImpactAssessment
  clusters: EventCluster[]
  sourceAnalysis: SourceAnalysis
  keyEntities: {
    locations: Array<{ name: string; count: number; type: 'mention' | 'inferred' }>
    countries: Array<{ name: string; count: number }>
  }
}

/**
 * Génère une timeline détaillée des événements
 */
export function generateTimeline(events: any[]): TimelinePoint[] {
  // Grouper par jour
  const byDay = new Map<string, string[]>()

  events.forEach(event => {
    const date = event.publish_date?.split('T')[0]
    if (!date) return

    if (!byDay.has(date)) {
      byDay.set(date, [])
    }
    byDay.get(date)!.push(event.id)
  })

  // Convertir en points de timeline
  const points: TimelinePoint[] = Array.from(byDay.entries())
    .map(([date, eventIds]) => ({
      date,
      count: eventIds.length,
      events: eventIds,
      peakIntensity: false,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Détecter les pics (> 1.5x la moyenne)
  const avgCount = points.reduce((sum, p) => sum + p.count, 0) / points.length
  const threshold = avgCount * 1.5

  points.forEach(point => {
    point.peakIntensity = point.count > threshold
  })

  return points
}

/**
 * Évalue l'impact d'un ensemble d'événements
 */
export function assessImpact(events: any[], timeline: TimelinePoint[]): ImpactAssessment {
  // Geographical spread
  const countriesSet = new Set<string>()
  const regionsSet = new Set<string>()
  const countryCount = new Map<string, number>()

  events.forEach(event => {
    event.event_locations?.forEach((loc: any) => {
      if (loc.country) {
        countriesSet.add(loc.country)
        countryCount.set(loc.country, (countryCount.get(loc.country) || 0) + 1)

        // Inférer région basée sur pays (simplifié)
        const region = getRegion(loc.country)
        if (region) regionsSet.add(region)
      }
    })
  })

  const primaryLocations = Array.from(countryCount.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Temporal density
  const dates = timeline.map(t => t.date).sort()
  const daySpan = dates.length || 1
  const eventsPerDay = events.length / daySpan

  const peakPoint = timeline.reduce((max, p) =>
    p.count > max.count ? p : max,
    timeline[0] || { date: '', count: 0, events: [], peakIntensity: false }
  )

  // Calculer la tendance (première moitié vs deuxième moitié)
  const midPoint = Math.floor(timeline.length / 2)
  const firstHalf = timeline.slice(0, midPoint)
  const secondHalf = timeline.slice(midPoint)

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.count, 0) / (firstHalf.length || 1)
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.count, 0) / (secondHalf.length || 1)

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (secondAvg > firstAvg * 1.2) trend = 'increasing'
  else if (secondAvg < firstAvg * 0.8) trend = 'decreasing'

  // Information volume
  const networkCount = new Map<string, number>()
  events.forEach(event => {
    const network = event.network || 'unknown'
    networkCount.set(network, (networkCount.get(network) || 0) + 1)
  })

  // Severity assessment
  const { level, factors, score } = calculateSeverity(events, countriesSet.size, eventsPerDay)

  return {
    geographicalSpread: {
      countriesAffected: countriesSet.size,
      regionsAffected: Array.from(regionsSet),
      primaryLocations,
    },
    temporalDensity: {
      eventsPerDay,
      peakDate: peakPoint.date,
      peakCount: peakPoint.count,
      trend,
    },
    informationVolume: {
      totalSources: events.length,
      newsCount: networkCount.get('news') || 0,
      twitterCount: networkCount.get('twitter') || 0,
      averageSourcesPerDay: events.length / daySpan,
    },
    severity: {
      level,
      factors,
      score,
    },
  }
}

/**
 * Calcule le niveau de sévérité
 */
function calculateSeverity(
  events: any[],
  countriesCount: number,
  eventsPerDay: number
): { level: 'low' | 'medium' | 'high' | 'critical'; factors: string[]; score: number } {
  let score = 0
  const factors: string[] = []

  // Facteur 1: Volume d'événements par jour
  if (eventsPerDay > 100) {
    score += 30
    factors.push('High event frequency (>100/day)')
  } else if (eventsPerDay > 50) {
    score += 20
    factors.push('Moderate event frequency (50-100/day)')
  } else if (eventsPerDay > 20) {
    score += 10
    factors.push('Notable event frequency (20-50/day)')
  }

  // Facteur 2: Spread géographique
  if (countriesCount > 20) {
    score += 25
    factors.push(`Wide geographical spread (${countriesCount} countries)`)
  } else if (countriesCount > 10) {
    score += 15
    factors.push(`Moderate geographical spread (${countriesCount} countries)`)
  } else if (countriesCount > 5) {
    score += 10
    factors.push(`Regional impact (${countriesCount} countries)`)
  }

  // Facteur 3: Types d'événements critiques
  const criticalTypes = ['Explosion', 'Shooting', 'Clash', 'Shelling / Rocket Incident', 'Cyberattack']
  const hasCriticalEvents = events.some(e =>
    e.event_labels?.some((l: any) =>
      l.type === 'Main Categories' && criticalTypes.includes(l.value)
    )
  )

  if (hasCriticalEvents) {
    score += 25
    factors.push('Contains critical event types (violence, attacks)')
  }

  // Facteur 4: Volume total
  if (events.length > 1000) {
    score += 20
    factors.push(`High information volume (${events.length} events)`)
  } else if (events.length > 500) {
    score += 10
    factors.push(`Significant information volume (${events.length} events)`)
  }

  // Déterminer le niveau
  let level: 'low' | 'medium' | 'high' | 'critical'
  if (score >= 75) level = 'critical'
  else if (score >= 50) level = 'high'
  else if (score >= 25) level = 'medium'
  else level = 'low'

  return { level, factors, score }
}

/**
 * Cluster les événements par similarité
 */
export function clusterEvents(events: any[]): EventCluster[] {
  // Grouper par type d'événement principal
  const byType = new Map<string, any[]>()

  events.forEach(event => {
    const mainCategory = event.event_labels?.find(
      (l: any) => l.type === 'Main Categories'
    )
    const type = mainCategory?.value || 'Other'

    if (!byType.has(type)) {
      byType.set(type, [])
    }
    byType.get(type)!.push(event)
  })

  // Créer les clusters
  const clusters: EventCluster[] = []

  byType.forEach((clusterEvents, type) => {
    if (clusterEvents.length < 3) return // Ignorer les petits clusters

    const dates = clusterEvents.map(e => e.publish_date).filter(Boolean).sort()
    const countries = new Map<string, number>()
    const keywords = new Set<string>()

    clusterEvents.forEach(event => {
      // Compter les pays
      event.event_locations?.forEach((loc: any) => {
        if (loc.country) {
          countries.set(loc.country, (countries.get(loc.country) || 0) + 1)
        }
      })

      // Extraire keywords simples (mots de 4+ caractères)
      const text = (event.text || event.english_sentence || '').toLowerCase()
      const words = text.match(/\b[a-z]{4,}\b/g) || []
      words.slice(0, 10).forEach(w => keywords.add(w))
    })

    const primaryLocation = Array.from(countries.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    clusters.push({
      id: `cluster-${type.toLowerCase().replace(/\s+/g, '-')}`,
      theme: type,
      eventIds: clusterEvents.map(e => e.id),
      eventCount: clusterEvents.length,
      dateRange: {
        start: dates[0]?.split('T')[0] || '',
        end: dates[dates.length - 1]?.split('T')[0] || '',
      },
      primaryLocation,
      keywords: Array.from(keywords).slice(0, 10),
    })
  })

  return clusters.sort((a, b) => b.eventCount - a.eventCount)
}

/**
 * Analyse la couverture par source
 */
export function analyzeSourceCoverage(events: any[]): SourceAnalysis {
  const byNetwork = new Map<string, any[]>()

  events.forEach(event => {
    const network = event.network || 'unknown'
    if (!byNetwork.has(network)) {
      byNetwork.set(network, [])
    }
    byNetwork.get(network)!.push(event)
  })

  // Calculer les statistiques par réseau
  const networkStats: Record<string, any> = {}
  let globalFirstMention = new Date().toISOString()
  let globalLastMention = new Date(0).toISOString()

  byNetwork.forEach((networkEvents, network) => {
    const dates = networkEvents.map(e => e.publish_date).filter(Boolean).sort()
    const firstReport = dates[0] || new Date().toISOString()
    const lastReport = dates[dates.length - 1] || new Date().toISOString()

    if (firstReport < globalFirstMention) globalFirstMention = firstReport
    if (lastReport > globalLastMention) globalLastMention = lastReport

    networkStats[network] = {
      count: networkEvents.length,
      firstReport,
      lastReport,
      averageDelay: 0, // Will calculate after
    }
  })

  // Calculer le délai moyen depuis la première mention
  const firstTime = new Date(globalFirstMention).getTime()
  Object.values(networkStats).forEach((stats: any) => {
    const thisTime = new Date(stats.firstReport).getTime()
    stats.averageDelay = Math.round((thisTime - firstTime) / (1000 * 60)) // Minutes
  })

  // Coverage overlap
  const newsCount = networkStats['news']?.count || 0
  const twitterCount = networkStats['twitter']?.count || 0

  return {
    byNetwork: networkStats,
    coverage: {
      newsOnly: newsCount,
      twitterOnly: twitterCount,
      both: 0, // Simplifié pour l'instant
    },
    timing: {
      firstMention: globalFirstMention,
      lastMention: globalLastMention,
      totalSpan: Math.round((new Date(globalLastMention).getTime() - new Date(globalFirstMention).getTime()) / (1000 * 60 * 60)), // Hours
    },
  }
}

/**
 * Extrait les entités clés (locations, countries)
 */
export function extractKeyEntities(events: any[]): SituationalReport['keyEntities'] {
  const locationCount = new Map<string, { count: number; type: 'mention' | 'inferred' }>()
  const countryCount = new Map<string, number>()

  events.forEach(event => {
    const seenLocations = new Set<string>()
    const seenCountries = new Set<string>()

    event.event_locations?.forEach((loc: any) => {
      // Locations
      if (loc.name && !seenLocations.has(loc.name)) {
        seenLocations.add(loc.name)
        const current = locationCount.get(loc.name) || { count: 0, type: loc.location_type }
        locationCount.set(loc.name, {
          count: current.count + 1,
          type: loc.location_type
        })
      }

      // Countries
      if (loc.country && !seenCountries.has(loc.country)) {
        seenCountries.add(loc.country)
        countryCount.set(loc.country, (countryCount.get(loc.country) || 0) + 1)
      }
    })
  })

  return {
    locations: Array.from(locationCount.entries())
      .map(([name, data]) => ({ name, count: data.count, type: data.type }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    countries: Array.from(countryCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
  }
}

/**
 * Génère un rapport situationnel complet
 */
export function generateSituationalReport(events: any[]): SituationalReport {
  const timeline = generateTimeline(events)
  const impact = assessImpact(events, timeline)
  const clusters = clusterEvents(events)
  const sourceAnalysis = analyzeSourceCoverage(events)
  const keyEntities = extractKeyEntities(events)

  return {
    timeline,
    impact,
    clusters,
    sourceAnalysis,
    keyEntities,
  }
}

/**
 * Détermine la région géographique d'un pays (simplifié)
 */
function getRegion(country: string): string | null {
  const regions: Record<string, string[]> = {
    'North America': ['United States', 'Canada', 'Mexico'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela'],
    'Europe': ['United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 'Ukraine'],
    'Middle East': ['Israel', 'Iran', 'Iraq', 'Syria', 'Saudi Arabia', 'Turkey', 'Lebanon'],
    'Africa': ['Nigeria', 'South Africa', 'Egypt', 'Kenya', 'Ethiopia'],
    'Asia': ['China', 'India', 'Japan', 'South Korea', 'Thailand', 'Vietnam', 'Indonesia'],
    'Oceania': ['Australia', 'New Zealand'],
  }

  for (const [region, countries] of Object.entries(regions)) {
    if (countries.includes(country)) return region
  }

  return null
}
