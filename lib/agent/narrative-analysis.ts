/**
 * Narrative Analysis - Analyse le framing et les narratifs des événements
 * Identifie comment les événements sont discutés et cadrés différemment selon les sources
 */

export interface SentimentScore {
  score: number // -1 (negative) to +1 (positive)
  confidence: number
  indicators: string[] // Mots-clés qui ont influencé le score
}

export interface FramingPattern {
  pattern: string
  description: string
  frequency: number
  examples: string[]
  sources: {
    news: number
    twitter: number
  }
}

export interface NarrativeDivergence {
  topic: string
  newsFraming: {
    tone: 'neutral' | 'alarming' | 'factual' | 'analytical'
    keyPhrases: string[]
    focusAreas: string[]
  }
  twitterFraming: {
    tone: 'neutral' | 'emotional' | 'opinionated' | 'activist'
    keyPhrases: string[]
    focusAreas: string[]
  }
  divergenceScore: number // 0 (similar) to 1 (very different)
}

export interface ThematicCluster {
  theme: string
  keywords: string[]
  eventCount: number
  sentiment: SentimentScore
  dominantSource: 'news' | 'twitter' | 'balanced'
  evolution: 'emerging' | 'stable' | 'declining'
}

export interface NarrativeAnalysis {
  overallSentiment: SentimentScore
  framingPatterns: FramingPattern[]
  narrativeDivergences: NarrativeDivergence[]
  thematicClusters: ThematicCluster[]
  keyNarratives: {
    narrative: string
    supportingEvents: number
    timespan: { start: string; end: string }
  }[]
}

/**
 * Mots-clés pour détection de sentiment (simplifié)
 */
const SENTIMENT_KEYWORDS = {
  negative: [
    'attack', 'violence', 'death', 'killed', 'injured', 'explosion', 'fire',
    'arrested', 'crime', 'illegal', 'crisis', 'threat', 'danger', 'disaster',
    'collapse', 'failure', 'condemn', 'protest', 'clash', 'conflict',
    'tué', 'mort', 'blessé', 'attaque', 'violence', 'arrestation', 'crise',
    'menace', 'danger', 'catastrophe', 'conflit', 'échec'
  ],
  positive: [
    'rescue', 'saved', 'success', 'agreement', 'cooperation', 'peace',
    'recovery', 'growth', 'improvement', 'victory', 'celebration',
    'sauvetage', 'sauvé', 'succès', 'accord', 'coopération', 'paix',
    'croissance', 'amélioration', 'victoire', 'célébration'
  ],
  intensifiers: [
    'extremely', 'massive', 'major', 'critical', 'severe', 'significant',
    'unprecedented', 'shocking', 'devastating', 'alarming',
    'extrêmement', 'massif', 'majeur', 'critique', 'sévère', 'choquant'
  ],
}

const FRAMING_INDICATORS = {
  alarming: ['warning', 'alert', 'urgent', 'emergency', 'breaking', 'urgent', 'alerte', 'urgence'],
  analytical: ['analysis', 'study', 'research', 'data', 'statistics', 'trend', 'analyse', 'étude', 'données'],
  emotional: ['outrage', 'shock', 'fear', 'anger', 'hope', 'joy', 'colère', 'peur', 'espoir'],
  factual: ['reported', 'confirmed', 'announced', 'stated', 'according to', 'rapporté', 'confirmé', 'annoncé'],
}

/**
 * Analyse le sentiment d'un texte
 */
export function analyzeSentiment(text: string): SentimentScore {
  const lowerText = text.toLowerCase()
  const words = lowerText.split(/\s+/)

  let score = 0
  const indicators: string[] = []
  let matchCount = 0

  // Compter les mots négatifs
  SENTIMENT_KEYWORDS.negative.forEach(word => {
    const matches = lowerText.split(word).length - 1
    if (matches > 0) {
      score -= matches
      matchCount += matches
      indicators.push(`-${word}`)
    }
  })

  // Compter les mots positifs
  SENTIMENT_KEYWORDS.positive.forEach(word => {
    const matches = lowerText.split(word).length - 1
    if (matches > 0) {
      score += matches
      matchCount += matches
      indicators.push(`+${word}`)
    }
  })

  // Appliquer les intensificateurs
  const hasIntensifier = SENTIMENT_KEYWORDS.intensifiers.some(word => lowerText.includes(word))
  if (hasIntensifier && score !== 0) {
    score *= 1.5
  }

  // Normaliser le score entre -1 et 1
  const normalizedScore = Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)))

  // Calculer la confiance basée sur le nombre de matches
  const confidence = Math.min(0.95, matchCount / Math.max(words.length / 20, 1))

  return {
    score: normalizedScore,
    confidence,
    indicators: indicators.slice(0, 10),
  }
}

/**
 * Identifie les patterns de framing dans les événements
 */
export function identifyFramingPatterns(events: any[]): FramingPattern[] {
  const patterns = new Map<string, {
    description: string
    frequency: number
    examples: Set<string>
    news: number
    twitter: number
  }>()

  events.forEach(event => {
    const text = (event.text || event.english_sentence || '').toLowerCase()
    const network = event.network || 'unknown'

    // Détecter les patterns de framing
    Object.entries(FRAMING_INDICATORS).forEach(([pattern, keywords]) => {
      const hasPattern = keywords.some(kw => text.includes(kw))
      if (hasPattern) {
        if (!patterns.has(pattern)) {
          patterns.set(pattern, {
            description: getFramingDescription(pattern),
            frequency: 0,
            examples: new Set(),
            news: 0,
            twitter: 0,
          })
        }

        const data = patterns.get(pattern)!
        data.frequency++
        if (data.examples.size < 3) {
          data.examples.add(text.substring(0, 100))
        }
        if (network === 'news') data.news++
        if (network === 'twitter') data.twitter++
      }
    })

    // Pattern: Focus sur victimes
    if (text.match(/(\d+)\s+(killed|dead|injured|wounded|victim)/)) {
      const pattern = 'victim-focused'
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          description: 'Emphasizes human casualties and victims',
          frequency: 0,
          examples: new Set(),
          news: 0,
          twitter: 0,
        })
      }
      const data = patterns.get(pattern)!
      data.frequency++
      if (data.examples.size < 3) data.examples.add(text.substring(0, 100))
      if (network === 'news') data.news++
      if (network === 'twitter') data.twitter++
    }

    // Pattern: Focus sur autorités
    if (text.match(/(police|authorities|government|officials?|minister)/)) {
      const pattern = 'authority-focused'
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          description: 'Centers on official sources and authorities',
          frequency: 0,
          examples: new Set(),
          news: 0,
          twitter: 0,
        })
      }
      const data = patterns.get(pattern)!
      data.frequency++
      if (data.examples.size < 3) data.examples.add(text.substring(0, 100))
      if (network === 'news') data.news++
      if (network === 'twitter') data.twitter++
    }
  })

  return Array.from(patterns.entries())
    .map(([pattern, data]) => ({
      pattern,
      description: data.description,
      frequency: data.frequency,
      examples: Array.from(data.examples),
      sources: {
        news: data.news,
        twitter: data.twitter,
      },
    }))
    .sort((a, b) => b.frequency - a.frequency)
}

/**
 * Détecte les divergences narratives entre sources
 */
export function detectNarrativeDivergences(events: any[]): NarrativeDivergence[] {
  // Grouper par type d'événement
  const byType = new Map<string, { news: any[]; twitter: any[] }>()

  events.forEach(event => {
    const mainCategory = event.event_labels?.find(
      (l: any) => l.type === 'Main Categories'
    )
    const type = mainCategory?.value || 'Other'
    const network = event.network

    if (!byType.has(type)) {
      byType.set(type, { news: [], twitter: [] })
    }

    const data = byType.get(type)!
    if (network === 'news') data.news.push(event)
    if (network === 'twitter') data.twitter.push(event)
  })

  const divergences: NarrativeDivergence[] = []

  byType.forEach((data, type) => {
    if (data.news.length < 3 || data.twitter.length < 3) return

    // Analyser le framing de chaque source
    const newsTexts = data.news.map(e => e.text || e.english_sentence || '').join(' ')
    const twitterTexts = data.twitter.map(e => e.text || e.english_sentence || '').join(' ')

    const newsFraming = analyzeFraming(newsTexts)
    const twitterFraming = analyzeFraming(twitterTexts)

    // Calculer la divergence
    const divergenceScore = calculateDivergence(newsFraming, twitterFraming)

    if (divergenceScore > 0.3) {
      divergences.push({
        topic: type,
        newsFraming,
        twitterFraming,
        divergenceScore,
      })
    }
  })

  return divergences.sort((a, b) => b.divergenceScore - a.divergenceScore)
}

/**
 * Analyse le framing d'un corpus de texte
 */
function analyzeFraming(text: string): {
  tone: 'neutral' | 'alarming' | 'factual' | 'analytical' | 'emotional' | 'opinionated' | 'activist'
  keyPhrases: string[]
  focusAreas: string[]
} {
  const lowerText = text.toLowerCase()

  // Détecter le ton
  let tone: any = 'neutral'
  let maxScore = 0

  Object.entries(FRAMING_INDICATORS).forEach(([frameType, keywords]) => {
    const score = keywords.filter(kw => lowerText.includes(kw)).length
    if (score > maxScore) {
      maxScore = score
      tone = frameType
    }
  })

  // Extraire les phrases clés (mots de 4+ caractères les plus fréquents)
  const words = lowerText.match(/\b[a-z]{4,}\b/g) || []
  const wordFreq = new Map<string, number>()
  words.forEach(word => {
    if (!isStopWord(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  })

  const keyPhrases = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)

  // Identifier les zones de focus
  const focusAreas: string[] = []
  if (lowerText.includes('victim') || lowerText.includes('casualt')) focusAreas.push('Human Impact')
  if (lowerText.includes('econom') || lowerText.includes('market')) focusAreas.push('Economic')
  if (lowerText.includes('politic') || lowerText.includes('government')) focusAreas.push('Political')
  if (lowerText.includes('security') || lowerText.includes('safety')) focusAreas.push('Security')

  return {
    tone,
    keyPhrases,
    focusAreas,
  }
}

/**
 * Calcule le score de divergence entre deux framings
 */
function calculateDivergence(framing1: any, framing2: any): number {
  let score = 0

  // Divergence de ton
  if (framing1.tone !== framing2.tone) score += 0.4

  // Divergence de focus
  const focus1 = new Set(framing1.focusAreas)
  const focus2 = new Set(framing2.focusAreas)
  const intersection = new Set([...focus1].filter(x => focus2.has(x)))
  const union = new Set([...focus1, ...focus2])
  const focusSimilarity = intersection.size / (union.size || 1)
  score += (1 - focusSimilarity) * 0.6

  return Math.min(1, score)
}

/**
 * Extrait les clusters thématiques
 */
export function extractThematicClusters(events: any[]): ThematicCluster[] {
  const clusters = new Map<string, {
    keywords: Set<string>
    eventCount: number
    sentiments: number[]
    news: number
    twitter: number
    dates: string[]
  }>()

  events.forEach(event => {
    const type = event.event_labels?.find((l: any) => l.type === 'Main Categories')?.value || 'Other'
    const text = (event.text || event.english_sentence || '').toLowerCase()
    const network = event.network
    const date = event.publish_date

    if (!clusters.has(type)) {
      clusters.set(type, {
        keywords: new Set(),
        eventCount: 0,
        sentiments: [],
        news: 0,
        twitter: 0,
        dates: [],
      })
    }

    const cluster = clusters.get(type)!
    cluster.eventCount++
    if (network === 'news') cluster.news++
    if (network === 'twitter') cluster.twitter++
    if (date) cluster.dates.push(date)

    // Extraire keywords
    const words = text.match(/\b[a-z]{4,}\b/g) || []
    words.slice(0, 20).forEach(word => {
      if (!isStopWord(word)) cluster.keywords.add(word)
    })

    // Sentiment
    const sentiment = analyzeSentiment(text)
    cluster.sentiments.push(sentiment.score)
  })

  return Array.from(clusters.entries())
    .map(([theme, data]) => {
      const avgSentiment = data.sentiments.reduce((a, b) => a + b, 0) / (data.sentiments.length || 1)
      const dominantSource = data.news > data.twitter ? 'news' : data.twitter > data.news ? 'twitter' : 'balanced'

      // Déterminer l'évolution
      const sortedDates = data.dates.sort()
      const evolution = determineEvolution(sortedDates)

      return {
        theme,
        keywords: Array.from(data.keywords).slice(0, 15),
        eventCount: data.eventCount,
        sentiment: {
          score: avgSentiment,
          confidence: 0.7,
          indicators: [],
        },
        dominantSource,
        evolution,
      }
    })
    .sort((a, b) => b.eventCount - a.eventCount)
}

/**
 * Détermine l'évolution d'un cluster dans le temps
 */
function determineEvolution(dates: string[]): 'emerging' | 'stable' | 'declining' {
  if (dates.length < 5) return 'stable'

  const sorted = dates.sort()
  const midPoint = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, midPoint).length
  const secondHalf = sorted.slice(midPoint).length

  if (secondHalf > firstHalf * 1.3) return 'emerging'
  if (secondHalf < firstHalf * 0.7) return 'declining'
  return 'stable'
}

/**
 * Identifie les narratifs clés
 */
export function identifyKeyNarratives(events: any[], clusters: ThematicCluster[]): NarrativeAnalysis['keyNarratives'] {
  const narratives: NarrativeAnalysis['keyNarratives'] = []

  clusters.slice(0, 5).forEach(cluster => {
    const relatedEvents = events.filter(e => {
      const type = e.event_labels?.find((l: any) => l.type === 'Main Categories')?.value
      return type === cluster.theme
    })

    if (relatedEvents.length < 5) return

    const dates = relatedEvents.map(e => e.publish_date).filter(Boolean).sort()

    narratives.push({
      narrative: `${cluster.theme}: ${cluster.keywords.slice(0, 5).join(', ')}`,
      supportingEvents: relatedEvents.length,
      timespan: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || '',
      },
    })
  })

  return narratives
}

/**
 * Génère une analyse narrative complète
 */
export function generateNarrativeAnalysis(events: any[]): NarrativeAnalysis {
  // Sentiment global
  const allTexts = events.map(e => e.text || e.english_sentence || '').join(' ')
  const overallSentiment = analyzeSentiment(allTexts)

  // Patterns de framing
  const framingPatterns = identifyFramingPatterns(events)

  // Divergences narratives
  const narrativeDivergences = detectNarrativeDivergences(events)

  // Clusters thématiques
  const thematicClusters = extractThematicClusters(events)

  // Narratifs clés
  const keyNarratives = identifyKeyNarratives(events, thematicClusters)

  return {
    overallSentiment,
    framingPatterns,
    narrativeDivergences,
    thematicClusters,
    keyNarratives,
  }
}

/**
 * Vérifie si un mot est un stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
    'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
    'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
    'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are',
    'been', 'has', 'had', 'were', 'said', 'did', 'having', 'may', 'should', 'does', 'being',
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'est', 'sont', 'dans', 'pour', 'que',
    'qui', 'sur', 'avec', 'par', 'plus', 'pas', 'au', 'aux', 'ce', 'cette', 'ces', 'son', 'sa',
  ])
  return stopWords.has(word)
}

/**
 * Retourne une description pour un pattern de framing
 */
function getFramingDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    alarming: 'Uses urgent and attention-grabbing language',
    analytical: 'Presents data-driven and analytical perspective',
    emotional: 'Emphasizes emotional aspects and human reactions',
    factual: 'Focuses on verified facts and official statements',
  }
  return descriptions[pattern] || 'Pattern detected in coverage'
}
