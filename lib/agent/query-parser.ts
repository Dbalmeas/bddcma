/**
 * Query Parser - Analyse les requêtes en langage naturel pour CMA CGM Shipping Data
 * Utilise Mistral AI pour extraire les paramètres structurés
 * Support multilingue FR/EN avec tolérance au mélange
 */

import { getMistralLLM } from './mistral-llm'

// Entités métier shipping
export const SHIPPING_ENTITIES = {
  clients: ['client', 'customer', 'shipper', 'consignee', 'shipcomp', 'shipcomp_code', 'shipcomp_name'],
  ports: ['port', 'pol', 'pod', 'point_load', 'point_disch', 'origin', 'destination', 'port of loading', 'port of discharge'],
  trades: ['trade', 'route', 'lane', 'asia-europe', 'europe-asia', 'transpacific', 'transatlantic'],
  metrics: ['teu', 'nb_teu', 'volume', 'units', 'nb_units', 'weight', 'net_weight'],
  commodities: ['commodity', 'cargo', 'goods', 'commodity_description', 'commodity_code'],
  flags: ['haz', 'haz_flag', 'hazardous', 'reef', 'reef_flag', 'reefer', 'is_reefer', 'oog', 'oversize', 'oversize_flag', 'is_oog'],
  status: ['status', 'job_status', 'cancelled', 'active', 'confirmed'],
}

// Synonymes et variations courantes
export const SHIPPING_SYNONYMS: Record<string, string[]> = {
  volume: ['volume', 'volumes', 'quantité', 'quantities', 'amount', 'amounts'],
  teu: ['teu', 'teus', 'twenty-foot equivalent unit', 'conteneurs', 'containers'],
  client: ['client', 'clients', 'customer', 'customers', 'shipper', 'shippers', 'consignee', 'consignees'],
  port: ['port', 'ports', 'porto', 'harbor', 'harbour'],
  pol: ['pol', 'port of loading', 'port de chargement', 'origin', 'origins', 'point_load'],
  pod: ['pod', 'port of discharge', 'port de déchargement', 'destination', 'destinations', 'point_disch'],
  cancelled: ['cancelled', 'canceled', 'annulé', 'annulés', 'cancellation'],
  trade: ['trade', 'trades', 'route', 'routes', 'lane', 'lanes', 'ligne', 'lignes'],
}

export interface ParsedQuery {
  intent: 'report' | 'table' | 'graph' | 'search' | 'export' | 'analysis' | 'clarification'
  filters: {
    dateRange?: {
      start: string // ISO date
      end: string
    }
    client?: string | string[] // shipcomp_code ou shipcomp_name
    pol?: string | string[] // Port of Loading
    pod?: string | string[] // Port of Discharge
    trade?: string // Trade route
    status?: string[] // job_status filters (exclude Cancelled by default)
    commodity?: string[]
    flags?: {
      haz?: boolean
      reef?: boolean
      oog?: boolean
    }
  }
  outputFormat: 'text' | 'table' | 'chart' | 'json'
  language: 'en' | 'fr' | 'mixed'
  aggregation?: {
    groupBy?: 'client' | 'pol' | 'pod' | 'trade' | 'date' | 'commodity' | 'status'
    metric?: 'teu' | 'units' | 'weight' | 'count'
    level?: 'booking' | 'detail' // Niveau d'agrégation (Booking ou dtl_sequence)
  }
  ambiguity?: {
    detected: boolean
    suggestions?: string[]
    clarificationNeeded?: string
  }
  context?: {
    references?: string[] // Références aux questions précédentes
    temporal?: 'relative' | 'absolute' | 'comparative'
  }
}

/**
 * Parse une requête en langage naturel en paramètres structurés pour CMA CGM
 */
export async function parseQuery(
  userQuery: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  uiFilters?: {
    dateRange?: { from?: Date; to?: Date }
    clients?: string[]
    ports?: string[]
    trades?: string[]
  }
): Promise<ParsedQuery> {
  const llm = getMistralLLM()

  // Construire le contexte conversationnel
  const contextSummary = conversationHistory.length > 0
    ? `CONVERSATION HISTORY (last ${Math.min(3, conversationHistory.length)} messages):\n${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}`
    : ''

  const prompt = `You are a query parser for CMA CGM's shipping booking database. Extract structured information from the user's query.

AVAILABLE DATA SCHEMA:
- bookings table (level 1):
  * job_reference (PRIMARY KEY)
  * shipcomp_code, shipcomp_name (client information)
  * point_load, point_load_country (POL - Port of Loading)
  * point_disch, point_disch_country (POD - Port of Discharge)
  * origin, destination
  * booking_confirmation_date, cancellation_date
  * job_status (INTEGER: 0=Active, 1=Cancelled, etc.)
  
- dtl_sequences table (level 2, 1-N relationship with bookings):
  * job_reference (FK to bookings)
  * job_dtl_sequence
  * nb_teu (TEU volume - main metric)
  * nb_units (number of units)
  * commodity_description, commodity_code_lara
  * net_weight
  * haz_flag, reef_flag, is_reefer, oversize_flag, is_oog (boolean flags)

CURRENT DATE: ${new Date().toISOString().split('T')[0]}

${contextSummary}

USER QUERY: "${userQuery}"

SHIPPING JARGON TO RECOGNIZE:
- Clients: shipcomp_code, shipcomp_name, client, customer, shipper
- Ports: POL (Port of Loading/point_load), POD (Port of Discharge/point_disch)
- Trades: Asia-Europe, Europe-Asia, Transpacific, Transatlantic
- Metrics: TEU (nb_teu), units (nb_units), weight (net_weight)
- Abbreviations: TEU, OOG (Out of Gauge), POL, POD
- Status: Cancelled bookings should be EXCLUDED by default for volume analysis

TEMPORAL REFERENCES:
- Relative: "last quarter", "dernier trimestre", "this month", "ce mois-ci", "last week", "semaine dernière"
- Absolute: "January 2024", "janvier 2024", "Q1 2024"
- Comparative: "compared to last year", "par rapport à l'année dernière"

Extract the following information and return ONLY valid JSON (no markdown, no explanation):
{
  "intent": "report" | "table" | "graph" | "search" | "export" | "analysis" | "clarification",
  "filters": {
    "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } or null,
    "client": "client name or code" or ["array of clients"] or null,
    "pol": "port of loading" or ["array of POLs"] or null,
    "pod": "port of discharge" or ["array of PODs"] or null,
    "trade": "trade route name" or null,
    "status": ["Active"] or null (default: exclude Cancelled),
    "commodity": ["commodity names"] or null,
    "flags": { "haz": true/false, "reef": true/false, "oog": true/false } or null
  },
  "outputFormat": "text" | "table" | "chart" | "json",
  "language": "en" | "fr" | "mixed",
  "aggregation": {
    "groupBy": "client" | "pol" | "pod" | "trade" | "date" | "commodity" | "status" or null,
    "metric": "teu" | "units" | "weight" | "count" or null,
    "level": "booking" | "detail" or null
  },
  "ambiguity": {
    "detected": true/false,
    "suggestions": ["suggestion1", "suggestion2"] or null,
    "clarificationNeeded": "what needs clarification" or null
  },
  "context": {
    "references": ["reference to previous question"] or null,
    "temporal": "relative" | "absolute" | "comparative" or null
  }
}

RULES:
1. LANGUAGE DETECTION:
   - Detect primary language (en/fr) or "mixed" if both are present
   - Be tolerant of language mixing (common in shipping industry)

2. TEMPORAL REFERENCES:
   - "today" / "aujourd'hui": use today's date
   - "yesterday" / "hier": use yesterday's date
   - "last week" / "semaine dernière": last 7 days
   - "this month" / "ce mois-ci": current month
   - "last quarter" / "dernier trimestre": previous quarter
   - "Q1 2024": January 1 - March 31, 2024
   - Relative dates: calculate from CURRENT DATE

3. DEFAULT FILTERS:
   - For volume/analysis queries: ALWAYS exclude Cancelled bookings (job_status != 1)
   - Status filter default: ["Active"] (exclude Cancelled)

4. AGGREGATION LEVEL:
   - TEU volume (nb_teu) is at dtl_sequence level
   - When aggregating by client: group bookings by shipcomp_code/name, sum nb_teu from dtl_sequences
   - When aggregating by port: group by point_load or point_disch
   - metric: "teu" for volume analysis, "count" for booking counts

5. AMBIGUITY DETECTION:
   - If multiple clients/ports match: set ambiguity.detected = true
   - Provide suggestions array with top matches
   - Set clarificationNeeded with the ambiguous element

6. CONTEXT AWARENESS:
   - If query references previous conversation: extract in context.references
   - Detect temporal type (relative/absolute/comparative)
   - Use conversation history to resolve pronouns ("it", "them", "that client")

7. ENTITY RECOGNITION:
   - Recognize shipping jargon: TEU, POL, POD, OOG, trade routes
   - Map synonyms: "client" → shipcomp_name, "port" → point_load/point_disch
   - Handle abbreviations and full terms interchangeably

8. OUTPUT FORMAT:
   - "rapport" / "report" → outputFormat: "text"
   - "tableau" / "table" → outputFormat: "table"
   - "graphique" / "chart" / "graph" → outputFormat: "chart"
   - Volume queries → prefer "chart" with aggregation

Return ONLY the JSON object, nothing else.`

  try {
    const result = await llm.generateJSON<ParsedQuery>({
      model: 'mistral-large-latest',
      prompt,
      temperature: 0.1, // Bas pour cohérence
      maxTokens: 1500,
    })

    // Validation basique
    if (!result.intent || !result.outputFormat) {
      throw new Error('Invalid parsed query structure')
    }

    // Normaliser les dates si présentes
    if (result.filters.dateRange) {
      result.filters.dateRange.start = normalizeDate(result.filters.dateRange.start)
      result.filters.dateRange.end = normalizeDate(result.filters.dateRange.end)
    }

    // Appliquer les filtres UI par-dessus les filtres extraits
    if (uiFilters) {
      // Date range from UI
      if (uiFilters.dateRange?.from || uiFilters.dateRange?.to) {
        result.filters.dateRange = {
          start: uiFilters.dateRange.from
            ? normalizeDate(uiFilters.dateRange.from.toISOString())
            : result.filters.dateRange?.start || normalizeDate(new Date().toISOString()),
          end: uiFilters.dateRange.to
            ? normalizeDate(uiFilters.dateRange.to.toISOString())
            : result.filters.dateRange?.end || normalizeDate(new Date().toISOString()),
        }
      }

      // Clients from UI
      if (uiFilters.clients && uiFilters.clients.length > 0) {
        result.filters.client = uiFilters.clients
      }

      // Ports from UI
      if (uiFilters.ports && uiFilters.ports.length > 0) {
        // Try to determine if POL or POD based on context, default to both
        if (!result.filters.pol && !result.filters.pod) {
          result.filters.pol = uiFilters.ports
          result.filters.pod = uiFilters.ports
        }
      }
    }

    // Garantir l'exclusion des bookings annulés pour les analyses de volume
    if (result.intent === 'analysis' || result.intent === 'report' || result.aggregation) {
      if (!result.filters.status) {
        result.filters.status = ['Active']
      }
      // S'assurer que Cancelled n'est pas inclus
      if (result.filters.status.includes('Cancelled')) {
        result.filters.status = result.filters.status.filter(s => s !== 'Cancelled')
      }
    }

    // Définir le niveau d'agrégation par défaut
    if (result.aggregation && !result.aggregation.level) {
      // Si on agrège par client, on est au niveau booking
      // Si on agrège par métrique TEU, on doit agréger au niveau detail
      if (result.aggregation.metric === 'teu' || result.aggregation.metric === 'units' || result.aggregation.metric === 'weight') {
        result.aggregation.level = 'detail'
      } else {
        result.aggregation.level = 'booking'
      }
    }

    return result
  } catch (error: any) {
    console.error('Query parsing failed:', error)

    // Fallback : requête de recherche simple
    return {
      intent: 'search',
      filters: {},
      outputFormat: 'text',
      language: detectLanguage(userQuery),
      ambiguity: {
        detected: false,
      },
    }
  }
}

/**
 * Normalise une date au format ISO
 */
function normalizeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    return date.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Détecte la langue d'une requête (FR/EN/Mixed)
 */
function detectLanguage(query: string): 'en' | 'fr' | 'mixed' {
  const frenchWords = ['je', 'le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'à', 'dans', 'pour', 'sur', 'avec', 'volume', 'client', 'port', 'trimestre']
  const englishWords = ['the', 'and', 'for', 'with', 'from', 'to', 'volume', 'client', 'port', 'quarter']
  
  const lowerQuery = query.toLowerCase()
  
  const frenchCount = frenchWords.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerQuery)
  }).length
  
  const englishCount = englishWords.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerQuery)
  }).length

  if (frenchCount > 0 && englishCount > 0) {
    return 'mixed'
  }
  
  return frenchCount >= 2 ? 'fr' : 'en'
}
