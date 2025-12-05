/**
 * Système anti-hallucination
 * Valide les réponses de l'IA contre les données brutes
 */

import { getMistralLLM } from './mistral-llm'

export interface ValidationResult {
  valid: boolean
  confidence: number
  errors: string[]
  warnings: string[]
}

/**
 * Valide qu'une réponse générée ne contient pas d'hallucinations
 */
export async function validateResponse(
  response: string,
  rawData: any[],
  userQuery: string
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Vérifier les nombres mentionnés
  const numbersInResponse = extractNumbers(response)
  const stats = extractStatistics(rawData)

  for (const num of numbersInResponse) {
    if (!isNumberPlausible(num, stats)) {
      errors.push(`Le nombre ${num} ne correspond à aucune statistique dans les données`)
    }
  }

  // 2. Vérifier les dates mentionnées
  const datesInResponse = extractDates(response)
  const datesInData = rawData
    .map(d => d.publish_date)
    .filter(Boolean)
    .map(d => d.split('T')[0])

  for (const date of datesInResponse) {
    if (!datesInData.includes(date)) {
      warnings.push(`La date ${date} n'existe pas dans les données`)
    }
  }

  // 3. Vérifier les lieux mentionnés
  const locationsInResponse = extractLocations(response)
  const locationsInData = new Set<string>()

  rawData.forEach(event => {
    event.event_locations?.forEach((loc: any) => {
      if (loc.country) locationsInData.add(loc.country.toLowerCase())
      if (loc.name) locationsInData.add(loc.name.toLowerCase())
    })
  })

  for (const loc of locationsInResponse) {
    if (!locationsInData.has(loc.toLowerCase())) {
      warnings.push(`Le lieu "${loc}" n'a pas été trouvé dans les données`)
    }
  }

  // 4. Validation LLM (vérification croisée)
  const llmValidation = await validateWithLLM(response, rawData, userQuery)

  if (!llmValidation.valid) {
    errors.push(...llmValidation.errors)
  }

  // Calcul du score de confiance
  const confidence = calculateConfidence(errors, warnings, rawData.length)

  return {
    valid: errors.length === 0,
    confidence,
    errors,
    warnings,
  }
}

/**
 * Validation par LLM (vérification croisée)
 */
async function validateWithLLM(
  response: string,
  rawData: any[],
  userQuery: string
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const llm = getMistralLLM()

    // Créer un résumé des données brutes
    const dataSummary = {
      total: rawData.length,
      sample: rawData.slice(0, 5).map(e => ({
        id: e.id,
        text: e.text?.substring(0, 100),
        date: e.publish_date,
        network: e.network,
      })),
      statistics: extractStatistics(rawData),
    }

    const prompt = `You are a fact-checker. Verify if the AI response contains ONLY facts from the data.

USER QUERY: "${userQuery}"

AI RESPONSE: "${response.substring(0, 500)}"

DATA SUMMARY:
- Total events: ${dataSummary.total}
- Sample count: ${dataSummary.sample.length}
- Networks: ${Object.keys(dataSummary.statistics.byNetwork).join(', ')}

RULES:
- All numbers must match data
- All dates must exist in data
- All locations must exist in data
- No invented facts

Return ONLY valid JSON (no markdown, no explanation):
{"valid": true, "issues": [], "reasoning": "brief"}

If accurate: {"valid": true, "issues": [], "reasoning": "all facts verified"}
If hallucinations: {"valid": false, "issues": ["specific issue"], "reasoning": "why"}`

    const result = await llm.generateJSON<{
      valid: boolean
      issues: string[]
      reasoning: string
    }>({
      model: 'mistral-large-latest',
      prompt,
      temperature: 0.1, // Légère variation pour éviter les blocages
      maxTokens: 300, // Réduit pour forcer des réponses plus courtes
    })

    return {
      valid: result.valid,
      errors: result.issues || [],
    }
  } catch (error) {
    console.error('LLM validation failed:', error)
    // En cas d'erreur, on ne bloque pas mais on avertit
    return {
      valid: true,
      errors: ['LLM validation unavailable'],
    }
  }
}

/**
 * Extrait tous les nombres d'un texte
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g) || []
  return matches.map(m => parseInt(m.replace(/,/g, ''), 10)).filter(n => !isNaN(n))
}

/**
 * Extrait les dates au format YYYY-MM-DD
 */
function extractDates(text: string): string[] {
  const matches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []
  return [...new Set(matches)]
}

/**
 * Extrait les noms de lieux (heuristique simple)
 */
function extractLocations(text: string): string[] {
  // Regex pour détecter les capitales et villes (commence par majuscule)
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []

  // Filtrer les faux positifs (mots courants en début de phrase)
  const commonWords = new Set([
    'The', 'This', 'That', 'There', 'These', 'Those',
    'Une', 'Le', 'La', 'Les', 'Des', 'Ce', 'Cette',
    'Today', 'Yesterday', 'Tomorrow', 'Monday', 'Tuesday',
    'Aujourd', 'Hier', 'Demain', 'Lundi', 'Mardi',
  ])

  return matches.filter(word => !commonWords.has(word))
}

/**
 * Extrait les statistiques des données brutes
 */
function extractStatistics(rawData: any[]): any {
  const stats = {
    total: rawData.length,
    byNetwork: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
    byEventType: {} as Record<string, number>,
    uniqueLocations: new Set<string>(),
    dateRange: {
      start: '',
      end: '',
    },
  }

  const dates: string[] = []

  rawData.forEach(event => {
    // Par réseau
    const network = event.network || 'unknown'
    stats.byNetwork[network] = (stats.byNetwork[network] || 0) + 1

    // Par pays
    event.event_locations?.forEach((loc: any) => {
      if (loc.country) {
        stats.byCountry[loc.country] = (stats.byCountry[loc.country] || 0) + 1
        stats.uniqueLocations.add(loc.country)
      }
      if (loc.name) {
        stats.uniqueLocations.add(loc.name)
      }
    })

    // Par type d'événement
    event.event_labels?.forEach((label: any) => {
      if (label.type === 'Main Categories') {
        stats.byEventType[label.value] = (stats.byEventType[label.value] || 0) + 1
      }
    })

    // Dates
    if (event.publish_date) {
      dates.push(event.publish_date.split('T')[0])
    }
  })

  dates.sort()
  if (dates.length > 0) {
    stats.dateRange.start = dates[0]
    stats.dateRange.end = dates[dates.length - 1]
  }

  return stats
}

/**
 * Vérifie si un nombre est plausible selon les statistiques
 */
function isNumberPlausible(num: number, stats: any): boolean {
  // Le nombre doit être proche de certaines statistiques
  const allCounts = [
    stats.total,
    ...Object.values(stats.byNetwork),
    ...Object.values(stats.byCountry),
    ...Object.values(stats.byEventType),
  ] as number[]

  // Tolérance de 5%
  return allCounts.some(count => Math.abs(count - num) / count < 0.05)
}

/**
 * Calcule un score de confiance (0-1)
 */
function calculateConfidence(
  errors: string[],
  warnings: string[],
  dataSize: number
): number {
  if (errors.length > 0) return 0

  // Pénalités pour les warnings
  const warningPenalty = warnings.length * 0.1

  // Bonus pour la taille des données
  const dataSizeBonus = Math.min(dataSize / 1000, 0.2)

  return Math.max(0, Math.min(1, 0.8 - warningPenalty + dataSizeBonus))
}
