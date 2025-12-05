/**
 * External Context Gathering Module
 * Enriches event analysis with external information
 */

export interface EntityContext {
  entity: string
  type: 'country' | 'organization' | 'location' | 'person' | 'technology'
  description: string
  relevance: number
  sources: string[]
  additionalInfo: {
    population?: number
    region?: string
    capital?: string
    languages?: string[]
    gdp?: string
    knownFor?: string[]
  }
}

export interface HistoricalContext {
  topic: string
  description: string
  timeline: Array<{
    date: string
    event: string
  }>
  relatedEvents: number
  significance: string
}

export interface GeographicContext {
  country: string
  region: string
  neighbors: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  activeConflicts: string[]
  economicStatus: string
  politicalSituation: string
}

export interface TechnicalContext {
  technology: string
  category: string
  description: string
  securityImplications: string[]
  relatedIncidents: number
}

export interface ExternalContext {
  entities: EntityContext[]
  historicalContext: HistoricalContext[]
  geographicContext: GeographicContext[]
  technicalContext: TechnicalContext[]
  summary: {
    totalEntities: number
    criticalRegions: number
    emergingThreats: number
  }
}

/**
 * Base de connaissances pour le contexte géographique
 */
const GEOGRAPHIC_KNOWLEDGE: Record<string, GeographicContext> = {
  'United States': {
    country: 'United States',
    region: 'North America',
    neighbors: ['Canada', 'Mexico'],
    riskLevel: 'low',
    activeConflicts: [],
    economicStatus: 'Advanced economy, largest GDP globally',
    politicalSituation: 'Stable democracy with two-party system',
  },
  'Russia': {
    country: 'Russia',
    region: 'Eastern Europe/Northern Asia',
    neighbors: ['Ukraine', 'Kazakhstan', 'China', 'Finland', 'Norway'],
    riskLevel: 'high',
    activeConflicts: ['Ukraine conflict', 'Regional tensions'],
    economicStatus: 'Energy-dependent economy under sanctions',
    politicalSituation: 'Authoritarian government with limited opposition',
  },
  'China': {
    country: 'China',
    region: 'East Asia',
    neighbors: ['Russia', 'India', 'Vietnam', 'North Korea', 'Myanmar'],
    riskLevel: 'medium',
    activeConflicts: ['Taiwan tensions', 'South China Sea disputes'],
    economicStatus: 'Second largest economy, manufacturing hub',
    politicalSituation: 'One-party state with strong central government',
  },
  'Ukraine': {
    country: 'Ukraine',
    region: 'Eastern Europe',
    neighbors: ['Russia', 'Poland', 'Romania', 'Belarus', 'Slovakia'],
    riskLevel: 'critical',
    activeConflicts: ['Ongoing war with Russia since 2022'],
    economicStatus: 'War-torn economy, reliant on international aid',
    politicalSituation: 'Democratic government under martial law',
  },
  'Israel': {
    country: 'Israel',
    region: 'Middle East',
    neighbors: ['Palestine', 'Lebanon', 'Syria', 'Jordan', 'Egypt'],
    riskLevel: 'high',
    activeConflicts: ['Israeli-Palestinian conflict', 'Regional tensions'],
    economicStatus: 'Advanced economy, tech sector leader',
    politicalSituation: 'Parliamentary democracy with coalition governments',
  },
  'Iran': {
    country: 'Iran',
    region: 'Middle East',
    neighbors: ['Iraq', 'Turkey', 'Afghanistan', 'Pakistan'],
    riskLevel: 'high',
    activeConflicts: ['Regional proxy conflicts', 'Nuclear tensions'],
    economicStatus: 'Oil-based economy under international sanctions',
    politicalSituation: 'Theocratic republic with conservative leadership',
  },
  'Nigeria': {
    country: 'Nigeria',
    region: 'West Africa',
    neighbors: ['Benin', 'Niger', 'Chad', 'Cameroon'],
    riskLevel: 'high',
    activeConflicts: ['Boko Haram insurgency', 'Regional banditry'],
    economicStatus: 'Largest economy in Africa, oil-dependent',
    politicalSituation: 'Federal republic with corruption challenges',
  },
  'Mexico': {
    country: 'Mexico',
    region: 'North America',
    neighbors: ['United States', 'Guatemala', 'Belize'],
    riskLevel: 'medium',
    activeConflicts: ['Drug cartel violence', 'Organized crime'],
    economicStatus: 'Emerging market, USMCA member',
    politicalSituation: 'Federal republic with cartel influence in regions',
  },
  'India': {
    country: 'India',
    region: 'South Asia',
    neighbors: ['Pakistan', 'China', 'Bangladesh', 'Nepal', 'Myanmar'],
    riskLevel: 'medium',
    activeConflicts: ['Kashmir dispute', 'Border tensions with China'],
    economicStatus: 'Fast-growing economy, IT services leader',
    politicalSituation: 'Federal parliamentary democracy',
  },
  'Germany': {
    country: 'Germany',
    region: 'Central Europe',
    neighbors: ['France', 'Poland', 'Austria', 'Netherlands', 'Belgium'],
    riskLevel: 'low',
    activeConflicts: [],
    economicStatus: 'Largest economy in Europe, industrial powerhouse',
    politicalSituation: 'Stable federal parliamentary republic',
  },
}

/**
 * Base de connaissances pour les technologies et cyber-menaces
 */
const TECH_KNOWLEDGE: Record<string, TechnicalContext> = {
  'ransomware': {
    technology: 'Ransomware',
    category: 'Malware',
    description: 'Malicious software that encrypts data and demands payment for decryption',
    securityImplications: [
      'Data loss and business disruption',
      'Financial extortion',
      'Supply chain attacks',
      'Double extortion (data theft + encryption)',
    ],
    relatedIncidents: 0,
  },
  'ddos': {
    technology: 'DDoS Attack',
    category: 'Network Attack',
    description: 'Distributed Denial of Service attacks overwhelm systems with traffic',
    securityImplications: [
      'Service unavailability',
      'Economic losses',
      'Reputation damage',
      'Often used as distraction for other attacks',
    ],
    relatedIncidents: 0,
  },
  'phishing': {
    technology: 'Phishing',
    category: 'Social Engineering',
    description: 'Fraudulent attempts to obtain sensitive information through deception',
    securityImplications: [
      'Credential theft',
      'Initial access for larger attacks',
      'Financial fraud',
      'Business email compromise',
    ],
    relatedIncidents: 0,
  },
  'zero-day': {
    technology: 'Zero-Day Exploit',
    category: 'Vulnerability Exploitation',
    description: 'Exploitation of previously unknown software vulnerabilities',
    securityImplications: [
      'No available patches or defenses',
      'High-value targets',
      'Often used by APT groups',
      'Can affect millions of devices',
    ],
    relatedIncidents: 0,
  },
  'apt': {
    technology: 'APT (Advanced Persistent Threat)',
    category: 'Cyber Espionage',
    description: 'Sophisticated, long-term targeted cyberattacks typically by nation-states',
    securityImplications: [
      'Intellectual property theft',
      'Espionage',
      'Long-term network compromise',
      'Critical infrastructure targeting',
    ],
    relatedIncidents: 0,
  },
}

/**
 * Extrait les entités clés des événements
 */
function extractKeyEntities(events: any[]): EntityContext[] {
  const entities: EntityContext[] = []
  const countryCount: Record<string, number> = {}
  const techTerms: Record<string, number> = {}

  // Protection contre les événements vides
  if (!events || events.length === 0) {
    return []
  }

  // Comptage des pays
  events.forEach(event => {
    event.event_locations?.forEach((loc: any) => {
      if (loc.country) {
        countryCount[loc.country] = (countryCount[loc.country] || 0) + 1
      }
    })

    // Détection de termes techniques dans le texte
    const text = event.text?.toLowerCase() || ''
    Object.keys(TECH_KNOWLEDGE).forEach(term => {
      if (text.includes(term)) {
        techTerms[term] = (techTerms[term] || 0) + 1
      }
    })
  })

  // Pays mentionnés (top 10)
  Object.entries(countryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([country, count]) => {
      const geoInfo = GEOGRAPHIC_KNOWLEDGE[country]
      if (geoInfo) {
        entities.push({
          entity: country,
          type: 'country',
          description: `${geoInfo.economicStatus}. ${geoInfo.politicalSituation}`,
          relevance: count / events.length,
          sources: ['Internal knowledge base'],
          additionalInfo: {
            region: geoInfo.region,
            knownFor: geoInfo.activeConflicts.length > 0
              ? geoInfo.activeConflicts
              : [geoInfo.economicStatus],
          },
        })
      } else {
        entities.push({
          entity: country,
          type: 'country',
          description: `Country mentioned in ${count} events`,
          relevance: count / events.length,
          sources: ['Event data'],
          additionalInfo: {},
        })
      }
    })

  // Technologies mentionnées
  Object.entries(techTerms)
    .sort(([, a], [, b]) => b - a)
    .forEach(([term, count]) => {
      const techInfo = TECH_KNOWLEDGE[term]
      if (techInfo) {
        entities.push({
          entity: techInfo.technology,
          type: 'technology',
          description: techInfo.description,
          relevance: count / events.length,
          sources: ['Cybersecurity knowledge base'],
          additionalInfo: {
            knownFor: techInfo.securityImplications,
          },
        })
      }
    })

  return entities
}

/**
 * Génère le contexte historique basé sur les patterns temporels
 */
function generateHistoricalContext(events: any[]): HistoricalContext[] {
  const contexts: HistoricalContext[] = []

  // Protection contre les événements vides
  if (!events || events.length === 0) {
    return []
  }

  // Grouper par type d'événement
  const eventsByType: Record<string, any[]> = {}
  events.forEach(event => {
    const types = event.event_labels
      ?.filter((label: any) => label.type === 'Main Categories')
      .map((label: any) => label.value) || []

    types.forEach((type: string) => {
      if (!eventsByType[type]) eventsByType[type] = []
      eventsByType[type].push(event)
    })
  })

  // Créer un contexte pour les types majeurs
  Object.entries(eventsByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 5)
    .forEach(([type, typeEvents]) => {
      if (typeEvents.length >= 10) {
        // Extraire la timeline
        const timeline = typeEvents
          .sort((a, b) => new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime())
          .slice(0, 5)
          .map(event => ({
            date: new Date(event.publish_date).toLocaleDateString(),
            event: event.text?.substring(0, 100) + '...' || 'No description',
          }))

        let significance = 'Moderate activity level'
        if (typeEvents.length > 100) significance = 'High frequency of incidents'
        else if (typeEvents.length > 50) significance = 'Elevated activity'

        contexts.push({
          topic: type,
          description: `${typeEvents.length} incidents of type "${type}" detected in the analyzed period`,
          timeline,
          relatedEvents: typeEvents.length,
          significance,
        })
      }
    })

  return contexts
}

/**
 * Génère le contexte géographique pour les pays affectés
 */
function generateGeographicContext(events: any[]): GeographicContext[] {
  const contexts: GeographicContext[] = []
  const countrySet = new Set<string>()

  // Protection contre les événements vides
  if (!events || events.length === 0) {
    return []
  }

  events.forEach(event => {
    event.event_locations?.forEach((loc: any) => {
      if (loc.country) countrySet.add(loc.country)
    })
  })

  countrySet.forEach(country => {
    const geoInfo = GEOGRAPHIC_KNOWLEDGE[country]
    if (geoInfo) {
      contexts.push(geoInfo)
    }
  })

  return contexts
}

/**
 * Génère le contexte technique pour les cyber-menaces
 */
function generateTechnicalContext(events: any[]): TechnicalContext[] {
  const contexts: TechnicalContext[] = []
  const techCount: Record<string, number> = {}

  // Protection contre les événements vides
  if (!events || events.length === 0) {
    return []
  }

  events.forEach(event => {
    const text = event.text?.toLowerCase() || ''
    Object.keys(TECH_KNOWLEDGE).forEach(term => {
      if (text.includes(term)) {
        techCount[term] = (techCount[term] || 0) + 1
      }
    })
  })

  Object.entries(techCount).forEach(([term, count]) => {
    const techInfo = TECH_KNOWLEDGE[term]
    if (techInfo && count >= 3) {
      contexts.push({
        ...techInfo,
        relatedIncidents: count,
      })
    }
  })

  return contexts
}

/**
 * Génère le contexte externe complet
 */
export function generateExternalContext(events: any[]): ExternalContext {
  console.log('🌐 Gathering external context...')

  const entities = extractKeyEntities(events)
  const historicalContext = generateHistoricalContext(events)
  const geographicContext = generateGeographicContext(events)
  const technicalContext = generateTechnicalContext(events)

  const criticalRegions = geographicContext.filter(g =>
    g.riskLevel === 'critical' || g.riskLevel === 'high'
  ).length

  const emergingThreats = technicalContext.filter(t =>
    t.relatedIncidents >= 5
  ).length

  console.log(`✅ External context gathered: ${entities.length} entities, ${criticalRegions} critical regions, ${emergingThreats} emerging threats`)

  return {
    entities,
    historicalContext,
    geographicContext,
    technicalContext,
    summary: {
      totalEntities: entities.length,
      criticalRegions,
      emergingThreats,
    },
  }
}
