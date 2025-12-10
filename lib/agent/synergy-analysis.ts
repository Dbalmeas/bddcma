/**
 * Synergy Analysis - Analyse des opportunités de synergies logistiques Import-Export (Match Back)
 * 
 * PRINCIPE DU MATCH BACK:
 * Identifier les opportunités de réutilisation des conteneurs en connectant flux import et export 
 * sur une même zone géographique.
 * 
 * Critères de Match:
 * - Zone géographique: Proximité entre point d'arrivée import (POD) et point de départ export (POL)
 * - Type d'équipement: Compatibilité (40HC, 20', reefer, etc.)
 * - Timing: Fenêtre temporelle compatible entre arrivée import et départ export
 * - Volume: Capacité d'absorption des flux
 * 
 * Bénéfices:
 * - Réduction des repositionnements à vide
 * - Diminution des coûts logistiques
 * - Réduction de l'empreinte carbone
 * - Amélioration de la satisfaction client
 */

import { supabase } from '../supabase'

export interface ZoneSynergy {
  zone: string               // Région/port pivot
  country?: string           // Pays
  importClients: ClientFlow[]
  exportClients: ClientFlow[]
  totalImportTEU: number
  totalExportTEU: number
  synergyPotential: number   // Score 0-100
  matchBackOpportunities: MatchBackOpportunity[]
}

export interface ClientFlow {
  clientCode: string
  clientName: string
  direction: 'import' | 'export'
  teu: number
  units: number
  bookings: number
  mainPorts: string[]
  equipmentTypes: string[]
  avgVolume: number
}

export interface MatchBackOpportunity {
  importClient: ClientFlow
  exportClients: ClientFlow[]
  zone: string
  equipmentMatch: string[]     // Types de conteneurs compatibles
  volumeMatch: number          // % de volume absorbable
  estimatedSavings: {
    repositioningCost: number  // Estimation coût évité
    co2Reduction: number       // kg CO2 évité
  }
  priority: 'high' | 'medium' | 'low'
  recommendation: string
}

export interface SynergyAnalysisResult {
  zones: ZoneSynergy[]
  totalOpportunities: number
  topOpportunities: MatchBackOpportunity[]
  summary: {
    potentialSavings: number
    potentialCO2Reduction: number
    clientPairs: number
  }
  insights: SynergyInsight[]
}

export interface SynergyInsight {
  type: 'balance' | 'opportunity' | 'mismatch' | 'recommendation'
  severity: 'info' | 'warning' | 'success'
  title: string
  description: string
  metric?: number
}

/**
 * Analyse les synergies logistiques import-export sur les zones géographiques
 * Identifie les opportunités de Match Back pour réutilisation des conteneurs
 * 
 * OPTIMISATION: Utilise 2 requêtes simples et légères au lieu d'une grosse jointure
 */
export async function analyzeSynergies(
  dateRange?: { start: string; end: string },
  equipmentTypes?: string[],
  minVolumeTEU?: number
): Promise<SynergyAnalysisResult> {
  console.log('🔄 Starting synergy analysis (Match Back) - OPTIMIZED VERSION...')
  
  try {
    // APPROCHE OPTIMISÉE: 2 requêtes simples sans jointure
    // Requête 1: Récupérer les flux agrégés par client et zone (sans jointure dtl_sequences)
    console.log('📊 Step 1: Fetching bookings (no joins)...')
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        job_reference,
        partner_code,
        partner_name,
        point_load,
        point_load_country,
        point_disch,
        point_disch_country
      `)
      .neq('job_status', 9)
      .limit(5000)

    if (bookingsError) {
      console.error('❌ Bookings fetch error:', bookingsError)
      throw new Error(`Failed to retrieve bookings: ${bookingsError.message}`)
    }

    console.log(`📦 Retrieved ${bookings?.length || 0} bookings`)
    
    if (!bookings || bookings.length === 0) {
      console.log('⚠️ No bookings returned - returning empty result')
      return createEmptyResult()
    }

    // OPTIMISATION: On utilise 1 TEU par booking comme estimation
    // (Évite une requête coûteuse sur dtl_sequences qui timeout)
    // Les bookings représentent typiquement 1-2 TEU en moyenne
    const enrichedFlows = bookings.map((b: any) => ({
      ...b,
      teu: 1 // Estimation: 1 TEU par booking (moyenne réaliste)
    }))

    console.log(`📊 Analyzing ${enrichedFlows.length} bookings for synergies (1 TEU/booking estimation)...`)

    // Analyser les flux par zone géographique
    const zoneAnalysis = analyzeByZone(enrichedFlows)
    
    // Identifier les opportunités de Match Back
    const opportunities = identifyMatchBackOpportunities(zoneAnalysis, minVolumeTEU || 10)
    
    // Calculer les métriques de synthèse
    const summary = calculateSummary(opportunities, zoneAnalysis)
    
    // Générer les insights
    const insights = generateSynergyInsights(zoneAnalysis, opportunities)

    const result: SynergyAnalysisResult = {
      zones: zoneAnalysis,
      totalOpportunities: opportunities.length,
      topOpportunities: opportunities.slice(0, 10),
      summary,
      insights,
    }

    console.log(`✅ Found ${opportunities.length} Match Back opportunities across ${zoneAnalysis.length} zones`)

    return result
  } catch (err: any) {
    console.error('❌ Synergy analysis error:', err)
    throw new Error(`Synergy analysis failed: ${err.message}`)
  }
}

/**
 * Analyse les flux par zone géographique
 * Zone = pays de destination (POD) pour les imports = potentiel point de départ export
 */
function analyzeByZone(bookings: any[]): ZoneSynergy[] {
  const zoneMap = new Map<string, {
    imports: Map<string, ClientFlow>
    exports: Map<string, ClientFlow>
    country?: string
  }>()

  bookings.forEach((booking: any) => {
    // Déterminer la direction (import/export) basée sur les régions principales
    // Simplifié: Si destination = zone asiatique -> export depuis zone
    //            Si destination = zone non-asiatique et origine = Asie -> import vers zone
    
    const podCountry = booking.point_disch_country || ''
    const polCountry = booking.point_load_country || ''
    const pod = booking.point_disch || ''
    const pol = booking.point_load || ''
    
    // TEU déjà calculé dans enrichedFlows
    const teu = booking.teu || 1
    const units = 1 // Simplifié: 1 booking = 1 unité
    const equipTypes: string[] = [] // Plus disponible sans jointure dtl_sequences

    const clientCode = booking.partner_code || ''
    const clientName = booking.partner_name || 'Unknown'

    // Pour chaque booking, on analyse la zone POD (point d'arrivée = potentiel réutilisation)
    // et la zone POL (point de départ = besoin de conteneurs)
    
    // Zone d'arrivée (imports vers cette zone = conteneurs disponibles)
    const podZone = podCountry || pod.substring(0, 2)
    if (!zoneMap.has(podZone)) {
      zoneMap.set(podZone, {
        imports: new Map(),
        exports: new Map(),
        country: podCountry,
      })
    }
    const podZoneData = zoneMap.get(podZone)!
    
    // Ce booking représente un import VERS la zone podZone (conteneurs arrivent)
    updateClientFlow(podZoneData.imports, clientCode, clientName, 'import', teu, units, 1, pod, equipTypes as string[])
    
    // Zone de départ (exports depuis cette zone = besoin de conteneurs)
    const polZone = polCountry || pol.substring(0, 2)
    if (!zoneMap.has(polZone)) {
      zoneMap.set(polZone, {
        imports: new Map(),
        exports: new Map(),
        country: polCountry,
      })
    }
    const polZoneData = zoneMap.get(polZone)!
    
    // Ce booking représente un export DEPUIS la zone polZone (conteneurs partent)
    updateClientFlow(polZoneData.exports, clientCode, clientName, 'export', teu, units, 1, pol, equipTypes as string[])
  })

  // Convertir en tableau et calculer les potentiels de synergie
  const zones: ZoneSynergy[] = []
  
  zoneMap.forEach((data, zone) => {
    const importClients = Array.from(data.imports.values())
    const exportClients = Array.from(data.exports.values())
    
    const totalImportTEU = importClients.reduce((sum, c) => sum + c.teu, 0)
    const totalExportTEU = exportClients.reduce((sum, c) => sum + c.teu, 0)
    
    // Calculer le potentiel de synergie (équilibre import/export)
    const balance = Math.min(totalImportTEU, totalExportTEU)
    const maxFlow = Math.max(totalImportTEU, totalExportTEU)
    const synergyPotential = maxFlow > 0 ? (balance / maxFlow) * 100 : 0

    if (importClients.length > 0 && exportClients.length > 0) {
      zones.push({
        zone,
        country: data.country,
        importClients: importClients.sort((a, b) => b.teu - a.teu),
        exportClients: exportClients.sort((a, b) => b.teu - a.teu),
        totalImportTEU,
        totalExportTEU,
        synergyPotential,
        matchBackOpportunities: [], // Sera rempli ensuite
      })
    }
  })

  return zones.sort((a, b) => b.synergyPotential - a.synergyPotential)
}

function updateClientFlow(
  map: Map<string, ClientFlow>,
  clientCode: string,
  clientName: string,
  direction: 'import' | 'export',
  teu: number,
  units: number,
  bookings: number,
  port: string,
  equipTypes: string[]
): void {
  const key = clientCode || clientName
  
  if (!map.has(key)) {
    map.set(key, {
      clientCode,
      clientName,
      direction,
      teu: 0,
      units: 0,
      bookings: 0,
      mainPorts: [],
      equipmentTypes: [],
      avgVolume: 0,
    })
  }
  
  const flow = map.get(key)!
  flow.teu += teu
  flow.units += units
  flow.bookings += bookings
  
  if (port && !flow.mainPorts.includes(port)) {
    flow.mainPorts.push(port)
  }
  
  equipTypes.forEach(eq => {
    if (eq && !flow.equipmentTypes.includes(eq)) {
      flow.equipmentTypes.push(eq)
    }
  })
  
  flow.avgVolume = flow.teu / flow.bookings
}

/**
 * Identifie les opportunités de Match Back
 * Match un client import avec des clients export sur la même zone
 */
function identifyMatchBackOpportunities(
  zones: ZoneSynergy[],
  minVolumeTEU: number = 10
): MatchBackOpportunity[] {
  const opportunities: MatchBackOpportunity[] = []

  zones.forEach(zone => {
    // Pour chaque client importateur significatif
    zone.importClients
      .filter(c => c.teu >= minVolumeTEU)
      .forEach(importClient => {
        // Trouver les clients exportateurs compatibles
        const compatibleExporters = zone.exportClients
          .filter(exp => {
            // Exclure le même client (auto-synergie)
            if (exp.clientCode === importClient.clientCode) return false
            // Volume minimal
            if (exp.teu < minVolumeTEU * 0.5) return false
            // Vérifier compatibilité équipement
            const commonEquip = importClient.equipmentTypes.filter(e => 
              exp.equipmentTypes.includes(e) || 
              // Flexibilité: 40HC compatible avec 40HC
              (e.includes('40') && exp.equipmentTypes.some(x => x.includes('40'))) ||
              (e.includes('20') && exp.equipmentTypes.some(x => x.includes('20')))
            )
            return commonEquip.length > 0 || importClient.equipmentTypes.length === 0 || exp.equipmentTypes.length === 0
          })
          .slice(0, 5) // Top 5 par volume

        if (compatibleExporters.length > 0) {
          // Calculer le match de volume
          const exportVolume = compatibleExporters.reduce((sum, e) => sum + e.teu, 0)
          const volumeMatch = Math.min(100, (exportVolume / importClient.teu) * 100)

          // Calculer les équipements communs
          const equipmentMatch = [...new Set(
            compatibleExporters.flatMap(e => 
              e.equipmentTypes.filter(eq => 
                importClient.equipmentTypes.includes(eq) || 
                importClient.equipmentTypes.length === 0
              )
            )
          )]

          // Estimer les économies (estimations moyennes industrie)
          const matchedTEU = Math.min(importClient.teu, exportVolume)
          const estimatedSavings = {
            repositioningCost: matchedTEU * 150, // ~150€ par TEU repositionné évité
            co2Reduction: matchedTEU * 500,      // ~500kg CO2 par TEU
          }

          // Déterminer la priorité (critères ajustés pour 1 TEU/booking)
          let priority: 'high' | 'medium' | 'low' = 'low'
          if (volumeMatch >= 70 && matchedTEU >= 20) priority = 'high'
          else if (volumeMatch >= 40 || matchedTEU >= 10) priority = 'medium'

          const opportunity: MatchBackOpportunity = {
            importClient,
            exportClients: compatibleExporters,
            zone: zone.zone,
            equipmentMatch: equipmentMatch.length > 0 ? equipmentMatch : ['Standard (40HC, 20\')'],
            volumeMatch,
            estimatedSavings,
            priority,
            recommendation: generateRecommendation(importClient, compatibleExporters, zone, volumeMatch),
          }

          opportunities.push(opportunity)
          zone.matchBackOpportunities.push(opportunity)
        }
      })
  })

  // Trier par priorité puis par potentiel d'économie
  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return b.estimatedSavings.repositioningCost - a.estimatedSavings.repositioningCost
  })
}

function generateRecommendation(
  importClient: ClientFlow,
  exportClients: ClientFlow[],
  zone: ZoneSynergy,
  volumeMatch: number
): string {
  const exportNames = exportClients.slice(0, 3).map(e => e.clientName).join(', ')
  const potentialTEU = Math.min(importClient.teu, exportClients.reduce((s, e) => s + e.teu, 0))
  
  if (volumeMatch >= 80) {
    return `🎯 Opportunité optimale : Les conteneurs importés par ${importClient.clientName} vers ${zone.zone} peuvent être réutilisés pour les exports de ${exportNames}. Volume potentiel : ${potentialTEU.toFixed(0)} TEU.`
  } else if (volumeMatch >= 50) {
    return `💡 Synergie partielle : ${importClient.clientName} importe ${importClient.teu.toFixed(0)} TEU vers ${zone.zone}. ${Math.round(volumeMatch)}% absorbables par ${exportNames}.`
  } else {
    return `📋 Piste à explorer : Connecter les imports de ${importClient.clientName} (${importClient.teu.toFixed(0)} TEU) avec les exports de ${exportNames} sur ${zone.zone}.`
  }
}

function calculateSummary(
  opportunities: MatchBackOpportunity[],
  zones: ZoneSynergy[]
): SynergyAnalysisResult['summary'] {
  const potentialSavings = opportunities.reduce((sum, o) => sum + o.estimatedSavings.repositioningCost, 0)
  const potentialCO2Reduction = opportunities.reduce((sum, o) => sum + o.estimatedSavings.co2Reduction, 0)
  const clientPairs = opportunities.reduce((sum, o) => sum + o.exportClients.length, 0)

  return {
    potentialSavings,
    potentialCO2Reduction,
    clientPairs,
  }
}

function generateSynergyInsights(
  zones: ZoneSynergy[],
  opportunities: MatchBackOpportunity[]
): SynergyInsight[] {
  const insights: SynergyInsight[] = []

  // Insight: Zones avec meilleur équilibre
  const balancedZones = zones.filter(z => z.synergyPotential >= 70)
  if (balancedZones.length > 0) {
    insights.push({
      type: 'balance',
      severity: 'success',
      title: 'Zones équilibrées import-export',
      description: `${balancedZones.length} zone(s) présentent un excellent équilibre import/export (>70%) : ${balancedZones.slice(0, 3).map(z => z.zone).join(', ')}. Potentiel de réutilisation optimal.`,
      metric: balancedZones.length,
    })
  }

  // Insight: Zones avec déséquilibre (opportunité ou problème)
  const importHeavyZones = zones.filter(z => z.totalImportTEU > z.totalExportTEU * 1.5)
  if (importHeavyZones.length > 0) {
    const topZone = importHeavyZones[0]
    insights.push({
      type: 'mismatch',
      severity: 'warning',
      title: 'Excédent de conteneurs à l\'import',
      description: `Zone ${topZone.zone} : ${topZone.totalImportTEU.toFixed(0)} TEU importés vs ${topZone.totalExportTEU.toFixed(0)} TEU exportés. Risque de repositionnement à vide.`,
      metric: topZone.totalImportTEU - topZone.totalExportTEU,
    })
  }

  const exportHeavyZones = zones.filter(z => z.totalExportTEU > z.totalImportTEU * 1.5)
  if (exportHeavyZones.length > 0) {
    const topZone = exportHeavyZones[0]
    insights.push({
      type: 'mismatch',
      severity: 'warning',
      title: 'Déficit de conteneurs pour l\'export',
      description: `Zone ${topZone.zone} : ${topZone.totalExportTEU.toFixed(0)} TEU à exporter mais seulement ${topZone.totalImportTEU.toFixed(0)} TEU importés. Coût d'approvisionnement conteneurs.`,
      metric: topZone.totalExportTEU - topZone.totalImportTEU,
    })
  }

  // Insight: Opportunités prioritaires
  const highPriorityOpps = opportunities.filter(o => o.priority === 'high')
  if (highPriorityOpps.length > 0) {
    const totalSavings = highPriorityOpps.reduce((s, o) => s + o.estimatedSavings.repositioningCost, 0)
    insights.push({
      type: 'opportunity',
      severity: 'success',
      title: 'Opportunités Match Back prioritaires',
      description: `${highPriorityOpps.length} opportunité(s) à fort potentiel identifiée(s). Économies estimées : ${totalSavings.toLocaleString()}€ en coûts de repositionnement.`,
      metric: totalSavings,
    })
  }

  // Recommandation globale
  if (opportunities.length > 0) {
    const totalCO2 = opportunities.reduce((s, o) => s + o.estimatedSavings.co2Reduction, 0)
    insights.push({
      type: 'recommendation',
      severity: 'info',
      title: 'Impact environnemental potentiel',
      description: `En optimisant les synergies Match Back, réduction potentielle de ${(totalCO2 / 1000).toFixed(1)} tonnes de CO2 par an.`,
      metric: totalCO2,
    })
  }

  return insights
}

function createEmptyResult(): SynergyAnalysisResult {
  return {
    zones: [],
    totalOpportunities: 0,
    topOpportunities: [],
    summary: {
      potentialSavings: 0,
      potentialCO2Reduction: 0,
      clientPairs: 0,
    },
    insights: [{
      type: 'mismatch',
      severity: 'warning',
      title: 'Données insuffisantes',
      description: 'Aucune donnée de flux trouvée pour l\'analyse des synergies. Vérifiez les filtres de date.',
    }],
  }
}

/**
 * Détecte si une requête concerne l'analyse des synergies Match Back
 */
export function isSynergyQuery(query: string): boolean {
  const synergyKeywords = [
    'synergie', 'synergies', 'synergy',
    'match back', 'matchback', 'match-back',
    'import export', 'import-export', 'import/export',
    'réutilisation conteneur', 'réutiliser conteneur',
    'repositionnement', 'repositioning',
    'container reuse', 'conteneur vide',
    'flux import', 'flux export',
    'équilibre import', 'équilibre export',
    'balance import', 'balance export',
    'optimisation logistique', 'logistic optimization',
    'même zone', 'mêmes zones', 'same zone',
    'zone géographique', 'geographic zone',
  ]
  
  const lowerQuery = query.toLowerCase()
  return synergyKeywords.some(kw => lowerQuery.includes(kw))
}

/**
 * Génère le prompt spécialisé pour les réponses sur les synergies Match Back
 */
export function generateSynergyPrompt(
  userQuery: string,
  synergyResult: SynergyAnalysisResult,
  language: 'fr' | 'en' | 'mixed'
): string {
  const isFrench = language === 'fr' || language === 'mixed'
  
  const topZones = synergyResult.zones.slice(0, 5)
  const topOpps = synergyResult.topOpportunities.slice(0, 5)

  return `Tu es un expert en optimisation logistique maritime chez CMA CGM, spécialisé dans l'analyse Match Back.

🎯 OBJECTIF: Répondre à la question sur les synergies logistiques import-export avec des recommandations concrètes et actionnables.

📋 CONTEXTE MATCH BACK:
Le Match Back consiste à identifier les opportunités de réutilisation des conteneurs en connectant les flux import et export sur une même zone géographique. Cela permet:
✅ Réduction drastique des repositionnements à vide
✅ Diminution des coûts logistiques par conteneur (~150€/TEU économisé)
✅ Réduction de l'empreinte carbone (~500kg CO2/TEU)
✅ Amélioration de la satisfaction client

QUESTION UTILISATEUR: "${userQuery}"

📊 RÉSULTATS DE L'ANALYSE SYNERGIES:

🌍 TOP ZONES AVEC POTENTIEL MATCH BACK:
${topZones.map((z, i) => `
${i + 1}. **${z.zone}** (${z.country || 'N/A'})
   - Imports: ${z.totalImportTEU.toFixed(0)} TEU (${z.importClients.length} clients)
   - Exports: ${z.totalExportTEU.toFixed(0)} TEU (${z.exportClients.length} clients)
   - Potentiel de synergie: ${z.synergyPotential.toFixed(0)}%
   - Top clients import: ${z.importClients.slice(0, 3).map(c => c.clientName).join(', ')}
   - Top clients export: ${z.exportClients.slice(0, 3).map(c => c.clientName).join(', ')}`).join('\n')}

🎯 OPPORTUNITÉS MATCH BACK PRIORITAIRES:
${topOpps.map((o, i) => `
${i + 1}. [${o.priority.toUpperCase()}] Zone: ${o.zone}
   - Client Import: ${o.importClient.clientName} (${o.importClient.teu.toFixed(0)} TEU)
   - Clients Export compatibles: ${o.exportClients.map(e => `${e.clientName} (${e.teu.toFixed(0)} TEU)`).join(', ')}
   - Équipements compatibles: ${o.equipmentMatch.join(', ')}
   - Volume absorbable: ${o.volumeMatch.toFixed(0)}%
   - Économies estimées: ${o.estimatedSavings.repositioningCost.toLocaleString()}€ + ${(o.estimatedSavings.co2Reduction / 1000).toFixed(1)}t CO2
   - ${o.recommendation}`).join('\n')}

📈 SYNTHÈSE GLOBALE:
- Total opportunités détectées: ${synergyResult.totalOpportunities}
- Économies potentielles totales: ${synergyResult.summary.potentialSavings.toLocaleString()}€
- Réduction CO2 potentielle: ${(synergyResult.summary.potentialCO2Reduction / 1000).toFixed(1)} tonnes
- Paires client synergiques: ${synergyResult.summary.clientPairs}

💡 INSIGHTS CLÉS:
${synergyResult.insights.map(i => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join('\n')}

🎨 STRUCTURE DE RÉPONSE ATTENDUE:
${isFrench ? `
**Structure en français:**

📊 ANALYSE DES SYNERGIES LOGISTIQUES IMPORT-EXPORT

🎯 SYNTHÈSE EXÉCUTIVE
[2-3 phrases résumant les principales opportunités Match Back]

🗺️ ZONES À FORT POTENTIEL DE SYNERGIE
[Pour chaque zone clé:]
- **[Zone]**: [Volume import] TEU import ↔ [Volume export] TEU export
- Clients import: [liste]
- Clients export: [liste]
- Potentiel de réutilisation: [%]

💡 OPPORTUNITÉS MATCH BACK PRIORITAIRES
[Pour chaque opportunité majeure:]
- **Opportunité [N]**: [Description concrète avec clients nommés]
  - Volume concerné: [X] TEU
  - Économie estimée: [Y]€ + [Z] tonnes CO2

📋 EXEMPLE CONCRET
[Illustrer avec un exemple réel des données:]
"[Client A] importe [X] TEU vers [Zone], [Clients B et C] exportent en équivalent depuis cette zone → Réutilisation possible des conteneurs"

🎯 RECOMMANDATIONS COMMERCIALES
[Actions concrètes:]
1. **Court-terme**: [Action avec client spécifique]
2. **Moyen-terme**: [Stratégie de développement]

⚠️ POINTS D'ATTENTION
[Risques ou limites identifiés]
` : `
**Structure in English:**

📊 IMPORT-EXPORT LOGISTICS SYNERGY ANALYSIS

🎯 EXECUTIVE SUMMARY
[2-3 sentences summarizing main Match Back opportunities]

🗺️ HIGH SYNERGY POTENTIAL ZONES
[For each key zone:]
- **[Zone]**: [Import volume] TEU import ↔ [Export volume] TEU export
- Import clients: [list]
- Export clients: [list]
- Reuse potential: [%]

💡 PRIORITY MATCH BACK OPPORTUNITIES
[For each major opportunity:]
- **Opportunity [N]**: [Concrete description with named clients]
  - Volume involved: [X] TEU
  - Estimated savings: [Y]€ + [Z] tonnes CO2

📋 CONCRETE EXAMPLE
[Illustrate with real data example:]
"[Client A] imports [X] TEU to [Zone], [Clients B and C] export equivalent from this zone → Container reuse possible"

🎯 COMMERCIAL RECOMMENDATIONS
[Concrete actions:]
1. **Short-term**: [Action with specific client]
2. **Medium-term**: [Development strategy]

⚠️ ATTENTION POINTS
[Identified risks or limitations]
`}

🚨 RÈGLES CRITIQUES:
1. ❌ N'invente JAMAIS de chiffres - Utilise UNIQUEMENT les données fournies
2. ✅ Nomme les clients spécifiquement dans tes recommandations
3. ✅ Donne des exemples concrets de Match Back avec les données réelles
4. ✅ Quantifie les bénéfices (€ économisés, CO2 évité)
5. ✅ Propose une approche commerciale gagnant-gagnant
6. ${isFrench ? '🇫🇷 Réponds en FRANÇAIS' : '🇬🇧 Respond in ENGLISH'}

Génère maintenant l'analyse complète des synergies Match Back:`
}
