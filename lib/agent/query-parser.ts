/**
 * Query Parser - Analyse les requêtes en langage naturel pour CMA CGM Shipping Data
 * Utilise Mistral AI pour extraire les paramètres structurés
 * Support multilingue FR/EN avec tolérance au mélange
 */

import { getMistralLLM } from './mistral-llm'

// Entités métier shipping
export const SHIPPING_ENTITIES = {
  clients: ['client', 'customer', 'partner', 'partner_code', 'partner_name', 'uo_name'],
  shippers: ['shipper', 'transporter', 'carrier', 'shipcomp', 'shipcomp_code', 'shipcomp_name'],
  ports: ['port', 'pol', 'pod', 'point_load', 'point_disch', 'origin', 'destination', 'port of loading', 'port of discharge'],
  trades: ['trade', 'route', 'lane', 'asia-europe', 'europe-asia', 'transpacific', 'transatlantic'],
  metrics: ['teu', 'teus_booked', 'volume', 'units', 'nb_units', 'weight', 'net_weight_booked'],
  commodities: ['commodity', 'cargo', 'goods', 'commodity_description', 'commodity_code'],
  flags: ['haz', 'haz_flag', 'hazardous', 'reef', 'reef_flag', 'reefer', 'oog', 'oog_flag', 'out of gauge'],
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
  synergy: ['synergie', 'synergies', 'synergy', 'match back', 'matchback', 'import-export', 'import export', 'réutilisation', 'repositionnement'],
}

export interface ParsedQuery {
  intent: 'report' | 'table' | 'graph' | 'search' | 'export' | 'analysis' | 'clarification' | 'synergy'
  filters: {
    dateRange?: {
      start: string // ISO date
      end: string
    }
    client?: string | string[] // partner_code ou partner_name
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
  * partner_code, partner_name, uo_name (CLIENT information - who pays)
  * shipcomp_code, shipcomp_name (TRANSPORTER information - who transports)
  * point_load, point_load_country (POL - Port of Loading)
  * point_disch, point_disch_country (POD - Port of Discharge)
  * origin, destination
  * booking_confirmation_date, cancellation_date
  * job_status (INTEGER: 0=Active, 9=Cancelled, etc.)
  * contract_type (Spot vs Long Term)

- dtl_sequences table (level 2, 1-N relationship with bookings):
  * job_reference (FK to bookings)
  * job_dtl_sequence
  * teus_booked (TEU volume - main metric)
  * nb_units (number of units)
  * commodity_description, commodity_code_lara
  * net_weight_booked
  * haz_flag, reef_flag, oog_flag (boolean flags)

CURRENT DATE: ${new Date().toISOString().split('T')[0]}

AVAILABLE DATA PERIOD:
- Main dataset: January 2020 to June 2020 (6 months, ~1.065M bookings)
- Historical data: Full year 2019 (~123K bookings)
- Total period: 2019-01-01 to 2020-06-30 (18 months)
- NOTE: Very limited data outside this period (2017-2018: <200 bookings, 2020-07 onwards: <500 bookings)

GEOGRAPHIC CONTEXT:
- Main origin region: ASIA (China 59%, South Korea, Vietnam, Malaysia, Singapore)
- Main destination: Middle East (UAE 100%), South Asia (India, Pakistan), East Africa (Egypt)
- Top origin ports: CNNGB (Ningbo), CNSHK (Shekou), CNTAO (Qingdao), CNSHA (Shanghai), CNXMN (Xiamen)
- Top destination ports: UAE ports, INPAV (Pipavav), INNSA (Nhava Sheva), EGAIS (Ain Sukhna)
- Primary trade lanes: Asia-Middle East, Asia-India, Asia-East Africa

${contextSummary}

USER QUERY: "${userQuery}"

SHIPPING JARGON TO RECOGNIZE:
- Clients: partner_code, partner_name, uo_name, client, customer (who pays for the shipping)
- Transporters: shipcomp_code, shipcomp_name, carrier, shipper (who does the transport - e.g., CMA CGM, APL)
- Ports: POL (Port of Loading/point_load), POD (Port of Discharge/point_disch)
- Metrics: TEU (teus_booked), units (nb_units), weight (net_weight_booked)
- Abbreviations: TEU, OOG (Out of Gauge), POL, POD
- Status: Cancelled bookings (job_status=9) should be EXCLUDED by default for volume analysis

IMPORTANT - Geographic Filtering Rules:
- If query mentions a COUNTRY (e.g., "depuis la Chine", "from China", "China", "Chine"): 
  → Extract pol: "China" OR "CN" (will filter on point_load_country)
- If query mentions a SPECIFIC PORT (e.g., "depuis Ningbo", "from Shanghai"):
  → Extract pol: "Ningbo" OR "CNNGB" (will filter on point_load)
- If query mentions "Chinese ports" or "ports chinois" (plural, generic):
  → Extract pol: "China" OR "CN" (to get ALL Chinese ports via country filter)
  
Examples:
- "volume depuis la Chine" → pol: "China" (country filter)
- "volume depuis Ningbo" → pol: "Ningbo" (port filter)
- "top ports chinois" → pol: "China" (country filter to get all, then aggregate by port)

TEMPORAL REFERENCES (adapt to available data 2019 + Jan-Jun 2020):
- "last year", "année dernière" → 2019
- "this year", "cette année" → 2020 (Jan-Jun only)
- "Q1 2020", "Q2 2020" → use appropriate quarter in 2020
- "first half 2020", "premier semestre" → Jan-Jun 2020
- Comparative: "compared to last year" → compare 2020 vs 2019
- "recent", "récent" → focus on Q1-Q2 2020 (most data is here)

Extract the following information and return ONLY valid JSON (no markdown, no explanation):
{
  "intent": "report" | "table" | "graph" | "search" | "export" | "analysis" | "clarification" | "synergy",
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
   - IMPORTANT: Data is only available for 2019 and Jan-Jun 2020
   - If user asks for dates outside this range, set dateRange to the available period
   - "last year", "année dernière": use 2019-01-01 to 2019-12-31
   - "this year", "cette année": use 2020-01-01 to 2020-06-30
   - "Q1 2020": January 1 - March 31, 2020
   - "first half 2020", "premier semestre 2020": 2020-01-01 to 2020-06-30
   - If no date specified: use full available range (2019-01-01 to 2020-06-30)
   - Relative dates: map to available period, not current date

3. DEFAULT FILTERS:
   - For volume/analysis queries: ALWAYS exclude Cancelled bookings (job_status != 9)
   - Status filter default: ["Active"] (exclude Cancelled)

4. AGGREGATION LEVEL:
   - TEU volume (teus_booked) is at dtl_sequence level
   - When aggregating by client: group bookings by partner_code/name, sum teus_booked from dtl_sequences
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
   - Map synonyms: "client" → partner_name, "transporter" → shipcomp_name, "port" → point_load/point_disch
   - Handle abbreviations and full terms interchangeably
   - IMPORTANT: "client" refers to partner_* (who pays), NOT shipcomp_* (who transports)

8. OUTPUT FORMAT:
   - "rapport" / "report" → outputFormat: "text"
   - "tableau" / "table" → outputFormat: "table"
   - "graphique" / "chart" / "graph" → outputFormat: "chart"
   - Volume queries → prefer "chart" with aggregation

9. SYNERGY / MATCH BACK DETECTION (IMPORTANT):
   - If user asks about "synergies", "synergy", "match back", "import-export", "réutilisation conteneurs", 
     "repositionnement", "même zone", "mêmes zones", "opportunités logistiques" → intent: "synergy"
   - Keywords: synergie, synergy, match back, import export, import-export, flux import, flux export,
     réutilisation, repositionnement, container reuse, équilibre import/export, balance
   - Examples of synergy queries:
     * "Quels clients peuvent créer des synergies logistiques import-export sur les mêmes zones ?"
     * "Opportunités de match back entre clients"
     * "Réutilisation des conteneurs par zone"
     * "Which clients can share containers on same routes?"
   - For synergy queries: set intent to "synergy" and aggregation.groupBy to null (special handling)

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
