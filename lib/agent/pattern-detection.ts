/**
 * Pattern Detection - Détecte les motifs récurrents et anomalies
 * Identifie les tendances, patterns temporels, et événements similaires
 */

export interface TemporalPattern {
  pattern: string
  description: string
  frequency: 'daily' | 'weekly' | 'sporadic' | 'concentrated'
  occurrences: number
  dates: string[]
  eventType: string
  confidence: number
  examples: Array<{ date: string; text: string }>
}

export interface Anomaly {
  type: 'spike' | 'unusual_location' | 'rare_event' | 'temporal_gap'
  description: string
  severity: 'low' | 'medium' | 'high'
  date?: string
  location?: string
  eventType?: string
  deviation: number // How much it deviates from normal (std deviations)
  context: string
}

export interface SimilarEventCluster {
  clusterId: string
  representativeText: string
  eventIds: string[]
  count: number
  timespan: { start: string; end: string }
  locations: string[]
  similarity: number // 0-1
  category: string
}

export interface TrendPrediction {
  eventType: string
  trend: 'increasing' | 'decreasing' | 'stable' | 'cyclical'
  confidence: number
  currentRate: number // events per day
  predictedRate: number // predicted events per day for next period
  basis: string // What the prediction is based on
}

export interface GeographicPattern {
  pattern: string
  description: string
  countries: string[]
  correlation: number // How correlated events are across these countries
  eventType: string
  timelag?: number // Days between events in different countries
}

export interface PatternAnalysis {
  temporalPatterns: TemporalPattern[]
  anomalies: Anomaly[]
  similarEventClusters: SimilarEventCluster[]
  trendPredictions: TrendPrediction[]
  geographicPatterns: GeographicPattern[]
  summary: {
    totalPatternsDetected: number
    criticalAnomalies: number
    emergingTrends: number
  }
}

/**
 * Détecte les patterns temporels
 */
export function detectTemporalPatterns(events: any[]): TemporalPattern[] {
  const patterns: TemporalPattern[] = []

  // Grouper par type d'événement
  const byType = new Map<string, any[]>()
  events.forEach(event => {
    const type = event.event_labels?.find((l: any) => l.type === 'Main Categories')?.value || 'Other'
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(event)
  })

  byType.forEach((typeEvents, eventType) => {
    if (typeEvents.length < 3) return

    // Analyser la distribution temporelle
    const dates = typeEvents
      .map(e => e.publish_date)
      .filter(Boolean)
      .sort()

    if (dates.length < 3) return

    // Calculer les intervalles entre événements
    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      const days = daysBetween(dates[i - 1], dates[i])
      intervals.push(days)
    }

    // Détecter le pattern
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const stdDeviation = calculateStdDev(intervals)

    let frequency: 'daily' | 'weekly' | 'sporadic' | 'concentrated'
    let confidence = 0

    if (avgInterval < 1.5 && stdDeviation < 1) {
      frequency = 'daily'
      confidence = 0.9
    } else if (avgInterval >= 5 && avgInterval <= 9 && stdDeviation < 3) {
      frequency = 'weekly'
      confidence = 0.8
    } else if (stdDeviation < avgInterval * 0.3) {
      frequency = 'sporadic'
      confidence = 0.6
    } else {
      frequency = 'concentrated'
      confidence = 0.5
    }

    // Créer le pattern si assez confiant
    if (confidence >= 0.5 && typeEvents.length >= 5) {
      patterns.push({
        pattern: `${eventType} - ${frequency}`,
        description: `${eventType} events occur in a ${frequency} pattern (avg ${avgInterval.toFixed(1)} days apart)`,
        frequency,
        occurrences: typeEvents.length,
        dates: dates.map(d => d.split('T')[0]),
        eventType,
        confidence,
        examples: typeEvents.slice(0, 3).map(e => ({
          date: e.publish_date?.split('T')[0] || '',
          text: (e.text || e.english_sentence || '').substring(0, 100),
        })),
      })
    }
  })

  return patterns.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Détecte les anomalies
 */
export function detectAnomalies(events: any[]): Anomaly[] {
  const anomalies: Anomaly[] = []

  // 1. Détecter les spikes (pics d'activité inhabituels)
  const byDate = new Map<string, any[]>()
  events.forEach(event => {
    const date = event.publish_date?.split('T')[0]
    if (!date) return
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(event)
  })

  const counts = Array.from(byDate.values()).map(arr => arr.length)
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length
  const stdDev = calculateStdDev(counts)

  byDate.forEach((dayEvents, date) => {
    const count = dayEvents.length
    const deviation = (count - avgCount) / (stdDev || 1)

    if (deviation > 2) {
      anomalies.push({
        type: 'spike',
        description: `Unusual spike in activity: ${count} events (${deviation.toFixed(1)}σ above average)`,
        severity: deviation > 3 ? 'high' : 'medium',
        date,
        deviation,
        context: `Normal: ${avgCount.toFixed(0)} events/day`,
      })
    }
  })

  // 2. Détecter les événements dans des lieux inhabituels
  const locationFreq = new Map<string, number>()
  events.forEach(event => {
    event.event_locations?.forEach((loc: any) => {
      if (loc.country) {
        locationFreq.set(loc.country, (locationFreq.get(loc.country) || 0) + 1)
      }
    })
  })

  const totalEvents = events.length
  locationFreq.forEach((count, country) => {
    const frequency = count / totalEvents
    if (count === 1 && totalEvents > 50) {
      anomalies.push({
        type: 'unusual_location',
        description: `Rare single event in ${country}`,
        severity: 'low',
        location: country,
        deviation: 1,
        context: 'Only occurrence in this location',
      })
    }
  })

  // 3. Détecter les types d'événements rares
  const typeFreq = new Map<string, number>()
  events.forEach(event => {
    const type = event.event_labels?.find((l: any) => l.type === 'Main Categories')?.value
    if (type) {
      typeFreq.set(type, (typeFreq.get(type) || 0) + 1)
    }
  })

  typeFreq.forEach((count, type) => {
    const frequency = count / totalEvents
    if (count >= 3 && count <= 5 && frequency < 0.02) {
      anomalies.push({
        type: 'rare_event',
        description: `${type}: Only ${count} occurrences (${(frequency * 100).toFixed(1)}% of events)`,
        severity: 'medium',
        eventType: type,
        deviation: 2,
        context: 'Rare event type in this period',
      })
    }
  })

  // 4. Détecter les gaps temporels
  const sortedDates = events
    .map(e => e.publish_date)
    .filter(Boolean)
    .sort()

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = daysBetween(sortedDates[i - 1], sortedDates[i])
    if (gap > 3 && i < sortedDates.length - 1) {
      anomalies.push({
        type: 'temporal_gap',
        description: `${gap} day gap in event reporting`,
        severity: gap > 7 ? 'medium' : 'low',
        date: sortedDates[i].split('T')[0],
        deviation: gap / 3,
        context: `Gap from ${sortedDates[i - 1].split('T')[0]} to ${sortedDates[i].split('T')[0]}`,
      })
    }
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

/**
 * Trouve les clusters d'événements similaires
 */
export function findSimilarEventClusters(events: any[]): SimilarEventCluster[] {
  const clusters: SimilarEventCluster[] = []

  // Grouper par similarité de texte (approche simplifiée: mots communs)
  const processed = new Set<string>()

  events.forEach((event, idx) => {
    if (processed.has(event.id)) return

    const text = (event.text || event.english_sentence || '').toLowerCase()
    const words = new Set(text.match(/\b[a-z]{4,}\b/g) || [])

    if (words.size < 3) return

    // Trouver des événements similaires
    const similar: any[] = [event]
    processed.add(event.id)

    events.forEach((other, otherIdx) => {
      if (otherIdx <= idx || processed.has(other.id)) return

      const otherText = (other.text || other.english_sentence || '').toLowerCase()
      const otherWords = new Set(otherText.match(/\b[a-z]{4,}\b/g) || [])

      // Calculer la similarité Jaccard
      const intersection = new Set([...words].filter(w => otherWords.has(w)))
      const union = new Set([...words, ...otherWords])
      const similarity = intersection.size / (union.size || 1)

      if (similarity > 0.4) {
        similar.push(other)
        processed.add(other.id)
      }
    })

    if (similar.length >= 3) {
      const dates = similar.map(e => e.publish_date).filter(Boolean).sort()
      const locations = new Set<string>()
      similar.forEach(e => {
        e.event_locations?.forEach((loc: any) => {
          if (loc.country) locations.add(loc.country)
        })
      })

      const category = similar[0].event_labels?.find((l: any) => l.type === 'Main Categories')?.value || 'Other'

      clusters.push({
        clusterId: `cluster-${clusters.length}`,
        representativeText: (similar[0].text || similar[0].english_sentence || '').substring(0, 150),
        eventIds: similar.map(e => e.id),
        count: similar.length,
        timespan: {
          start: dates[0]?.split('T')[0] || '',
          end: dates[dates.length - 1]?.split('T')[0] || '',
        },
        locations: Array.from(locations).slice(0, 5),
        similarity: 0.7, // Moyenne approximative
        category,
      })
    }
  })

  return clusters.sort((a, b) => b.count - a.count).slice(0, 10)
}

/**
 * Prédit les tendances
 */
export function predictTrends(events: any[]): TrendPrediction[] {
  const predictions: TrendPrediction[] = []

  // Grouper par type
  const byType = new Map<string, any[]>()
  events.forEach(event => {
    const type = event.event_labels?.find((l: any) => l.type === 'Main Categories')?.value || 'Other'
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(event)
  })

  byType.forEach((typeEvents, eventType) => {
    if (typeEvents.length < 10) return

    // Analyser la tendance temporelle
    const dates = typeEvents.map(e => e.publish_date).filter(Boolean).sort()
    const daySpan = daysBetween(dates[0], dates[dates.length - 1]) || 1
    const currentRate = typeEvents.length / daySpan

    // Diviser en périodes pour détecter la tendance
    const midPoint = Math.floor(typeEvents.length / 2)
    const firstHalf = typeEvents.slice(0, midPoint)
    const secondHalf = typeEvents.slice(midPoint)

    const firstHalfDates = firstHalf.map(e => e.publish_date).filter(Boolean).sort()
    const secondHalfDates = secondHalf.map(e => e.publish_date).filter(Boolean).sort()

    const firstRate = firstHalf.length / (daysBetween(firstHalfDates[0], firstHalfDates[firstHalfDates.length - 1]) || 1)
    const secondRate = secondHalf.length / (daysBetween(secondHalfDates[0], secondHalfDates[secondHalfDates.length - 1]) || 1)

    let trend: 'increasing' | 'decreasing' | 'stable' | 'cyclical'
    let predictedRate = currentRate
    let confidence = 0.6

    if (secondRate > firstRate * 1.3) {
      trend = 'increasing'
      predictedRate = secondRate * 1.2
      confidence = 0.7
    } else if (secondRate < firstRate * 0.7) {
      trend = 'decreasing'
      predictedRate = secondRate * 0.8
      confidence = 0.7
    } else {
      trend = 'stable'
      predictedRate = currentRate
      confidence = 0.8
    }

    predictions.push({
      eventType,
      trend,
      confidence,
      currentRate: parseFloat(currentRate.toFixed(2)),
      predictedRate: parseFloat(predictedRate.toFixed(2)),
      basis: `Based on ${typeEvents.length} events over ${daySpan} days`,
    })
  })

  return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 8)
}

/**
 * Détecte les patterns géographiques
 */
export function detectGeographicPatterns(events: any[]): GeographicPattern[] {
  const patterns: GeographicPattern[] = []

  // Grouper par type d'événement
  const byType = new Map<string, any[]>()
  events.forEach(event => {
    const type = event.event_labels?.find((l: any) => l.type === 'Main Categories')?.value || 'Other'
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(event)
  })

  byType.forEach((typeEvents, eventType) => {
    if (typeEvents.length < 10) return

    // Compter les événements par pays
    const byCountry = new Map<string, any[]>()
    typeEvents.forEach(event => {
      event.event_locations?.forEach((loc: any) => {
        if (loc.country) {
          if (!byCountry.has(loc.country)) byCountry.set(loc.country, [])
          byCountry.get(loc.country)!.push(event)
        }
      })
    })

    // Chercher des pays avec correlation
    const countries = Array.from(byCountry.keys())
    if (countries.length >= 3) {
      // Pattern: Événements dans plusieurs pays
      const correlation = Math.min(0.9, countries.length / 10)

      patterns.push({
        pattern: `multi-country-${eventType}`,
        description: `${eventType} events occurring across multiple countries`,
        countries: countries.slice(0, 10),
        correlation,
        eventType,
      })
    }

    // Chercher des séquences temporelles entre pays
    if (countries.length >= 2) {
      for (let i = 0; i < countries.length - 1; i++) {
        const country1Events = byCountry.get(countries[i])!
        const country2Events = byCountry.get(countries[i + 1])!

        if (country1Events.length >= 2 && country2Events.length >= 2) {
          const dates1 = country1Events.map(e => e.publish_date).filter(Boolean).sort()
          const dates2 = country2Events.map(e => e.publish_date).filter(Boolean).sort()

          const avgDate1 = new Date(dates1[Math.floor(dates1.length / 2)])
          const avgDate2 = new Date(dates2[Math.floor(dates2.length / 2)])
          const timelag = Math.abs(daysBetween(avgDate1.toISOString(), avgDate2.toISOString()))

          if (timelag > 0 && timelag < 7) {
            patterns.push({
              pattern: `sequential-${eventType}`,
              description: `${eventType} events show temporal sequence between countries`,
              countries: [countries[i], countries[i + 1]],
              correlation: 0.7,
              eventType,
              timelag,
            })
            break // Only report one sequence
          }
        }
      }
    }
  })

  return patterns.slice(0, 8)
}

/**
 * Génère l'analyse complète des patterns
 */
export function generatePatternAnalysis(events: any[]): PatternAnalysis {
  console.log('🔍 Detecting temporal patterns...')
  const temporalPatterns = detectTemporalPatterns(events)

  console.log('⚠️  Detecting anomalies...')
  const anomalies = detectAnomalies(events)

  console.log('🔗 Finding similar event clusters...')
  const similarEventClusters = findSimilarEventClusters(events)

  console.log('📈 Predicting trends...')
  const trendPredictions = predictTrends(events)

  console.log('🌍 Detecting geographic patterns...')
  const geographicPatterns = detectGeographicPatterns(events)

  const criticalAnomalies = anomalies.filter(a => a.severity === 'high').length
  const emergingTrends = trendPredictions.filter(t => t.trend === 'increasing').length

  return {
    temporalPatterns,
    anomalies,
    similarEventClusters,
    trendPredictions,
    geographicPatterns,
    summary: {
      totalPatternsDetected: temporalPatterns.length + similarEventClusters.length + geographicPatterns.length,
      criticalAnomalies,
      emergingTrends,
    },
  }
}

/**
 * Calcule le nombre de jours entre deux dates
 */
function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calcule l'écart-type
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map(value => Math.pow(value - avg, 2))
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
  return Math.sqrt(avgSquareDiff)
}
