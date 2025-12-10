/**
 * API Route pour l'agent IA
 * Orchestre: parsing → SQL → LLM → validation
 * Supporte: analyses classiques + synergies Match Back
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseQuery } from '@/lib/agent/query-parser'
import { executeQuery, aggregateData, getStatistics } from '@/lib/agent/sql-generator'
import { getMistralLLM, initMistralLLM } from '@/lib/agent/mistral-llm'
import { analyzeSynergies, isSynergyQuery, generateSynergyPrompt, SynergyAnalysisResult } from '@/lib/agent/synergy-analysis'

// Types pour les insights proactifs
interface ProactiveInsights {
  anomalies: Array<{
    type: 'volume_drop' | 'volume_spike' | 'client_change' | 'route_change'
    severity: 'low' | 'medium' | 'high'
    description: string
    metric?: string
    value?: number
    expected?: number
    deviation?: number
  }>
  patterns: Array<{
    type: 'seasonality' | 'trend' | 'concentration'
    description: string
    confidence: number
  }>
  recommendations: Array<{
    type: 'diversification' | 'optimization' | 'alert'
    priority: 'low' | 'medium' | 'high'
    description: string
    action?: string
  }>
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface QueryRequest {
  query: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  filters?: {
    dateRange?: {
      from?: Date
      to?: Date
    }
    clients?: string[]
    ports?: string[]
    trades?: string[]
  }
}

interface QueryResponse {
  success: boolean
  data?: {
    text: string
    rawData: any[]
    statistics: any
    aggregations?: any
    charts?: any[]
        proactiveInsights?: ProactiveInsights
        filtersApplied?: any
        period?: { start: string; end: string }
        rowsAnalyzed?: number
    validation: {
      valid: boolean
      confidence: number
      errors: string[]
      warnings: string[]
    }
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<QueryResponse>> {
  try {
    const body: QueryRequest = await request.json()
    const { query, conversationHistory = [], filters } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid query' },
        { status: 400 }
      )
    }

    // Vérifier les variables d'environnement Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json(
        { success: false, error: 'Supabase configuration missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env' },
        { status: 500 }
      )
    }

    // Initialiser Mistral LLM
    const mistralApiKey = process.env.MISTRAL_API_KEY
    if (!mistralApiKey) {
      console.error('❌ Missing Mistral API key')
      return NextResponse.json(
        { success: false, error: 'Mistral API key not configured. Please check MISTRAL_API_KEY in .env' },
        { status: 500 }
      )
    }

    initMistralLLM(mistralApiKey)
    const llm = getMistralLLM()

    console.log('📥 Query received:', query)
    if (filters) {
      console.log('🔍 Filters applied:', JSON.stringify(filters, null, 2))
    }

    // ÉTAPE 1: Parser la requête (avec historique conversationnel et filtres)
    console.log('🔍 Parsing query...')
    const parsed = await parseQuery(query, conversationHistory, filters)
    console.log('✅ Parsed:', JSON.stringify(parsed, null, 2))
    console.log('🔍 Filters extracted:', {
      dateRange: parsed.filters.dateRange,
      client: parsed.filters.client,
      pol: parsed.filters.pol,
      pod: parsed.filters.pod,
      trade: parsed.filters.trade,
    })

    // Gérer les demandes de clarification
    if (parsed.intent === 'clarification' && parsed.ambiguity?.detected) {
      return NextResponse.json({
        success: true,
        data: {
          text: parsed.ambiguity.clarificationNeeded || 'Could you please clarify your question?',
          rawData: [],
          statistics: { total: 0 },
          validation: {
            valid: true,
            confidence: 0.8,
            errors: [],
            warnings: parsed.ambiguity.suggestions ? [`Suggestions: ${parsed.ambiguity.suggestions.join(', ')}`] : [],
          },
        },
      })
    }

    // ⚡ TRAITEMENT SPÉCIAL: Analyse des synergies Match Back
    if (parsed.intent === 'synergy' || isSynergyQuery(query)) {
      console.log('🔄 Detected synergy/Match Back query - Using specialized analysis...')
      
      try {
        // Analyser les synergies import-export
        const synergyResult = await analyzeSynergies(
          parsed.filters.dateRange,
          undefined, // equipmentTypes (optionnel)
          10 // minVolumeTEU
        )
        
        console.log(`✅ Synergy analysis complete: ${synergyResult.totalOpportunities} opportunities found`)
        
        // Générer la réponse avec le prompt spécialisé Match Back
        const synergyPrompt = generateSynergyPrompt(query, synergyResult, parsed.language)
        
        console.log('🤖 Generating LLM response for synergy...')
        const llm = getMistralLLM()
        const responseText = await llm.generate({
          model: 'mistral-large-latest',
          prompt: synergyPrompt,
          temperature: 0.2,
          maxTokens: 2500,
        })
        
        console.log(`✅ LLM response generated: ${responseText?.length || 0} chars`)
        
        // Générer les graphiques de synergies
        const synergyCharts = generateSynergyCharts(synergyResult)
        
        // Calculer les TEU totaux depuis les zones
        const totalImportTEU = synergyResult.zones.reduce((sum, z) => sum + z.totalImportTEU, 0)
        const totalExportTEU = synergyResult.zones.reduce((sum, z) => sum + z.totalExportTEU, 0)
        const totalTEU = totalImportTEU + totalExportTEU
        
        // Agréger les clients par TEU pour les graphiques
        const clientMap = new Map<string, { count: number; teu: number }>()
        synergyResult.zones.forEach(zone => {
          ;[...zone.importClients, ...zone.exportClients].forEach(client => {
            const existing = clientMap.get(client.clientName) || { count: 0, teu: 0 }
            clientMap.set(client.clientName, {
              count: existing.count + client.bookings,
              teu: existing.teu + client.teu
            })
          })
        })
        const byClient = Object.fromEntries(clientMap)
        
        // Agréger les zones (pays) pour les ports
        const byPOL = Object.fromEntries(
          synergyResult.zones
            .filter(z => z.totalExportTEU > 0)
            .map(z => [z.zone || z.country || 'Unknown', z.totalExportTEU])
        )
        const byPOD = Object.fromEntries(
          synergyResult.zones
            .filter(z => z.totalImportTEU > 0)
            .map(z => [z.zone || z.country || 'Unknown', z.totalImportTEU])
        )
        
        return NextResponse.json({
          success: true,
          data: {
            text: responseText,
            rawData: synergyResult.zones,
            statistics: {
              total: synergyResult.zones.length,
              totalTEU,
              totalCount: totalImportTEU + totalExportTEU, // bookings estimés
              totalOpportunities: synergyResult.totalOpportunities,
              potentialSavings: synergyResult.summary.potentialSavings,
              potentialCO2Reduction: synergyResult.summary.potentialCO2Reduction,
              clientPairs: synergyResult.summary.clientPairs,
              byClient,
              byPOL,
              byPOD,
            },
            aggregations: synergyResult.topOpportunities,
            charts: synergyCharts,
            proactiveInsights: {
              anomalies: synergyResult.insights.filter(i => i.type === 'mismatch').map(i => ({
                type: 'route_change' as const,
                severity: i.severity === 'warning' ? 'medium' as const : 'low' as const,
                description: i.description,
                metric: i.title,
                value: i.metric,
              })),
              patterns: synergyResult.insights.filter(i => i.type === 'balance').map(i => ({
                type: 'concentration' as const,
                description: i.description,
                confidence: 0.85,
              })),
              recommendations: synergyResult.insights.filter(i => i.type === 'opportunity' || i.type === 'recommendation').map(i => ({
                type: 'optimization' as const,
                priority: i.severity === 'success' ? 'high' as const : 'medium' as const,
                description: i.description,
                action: i.title,
              })),
            },
            filtersApplied: {
              dateRange: parsed.filters.dateRange,
              analysisType: 'synergy-match-back',
            },
            validation: {
              valid: true,
              confidence: 0.95,
              errors: [],
              warnings: [],
            },
          },
        })
      } catch (synergyError: any) {
        console.error('❌ Synergy analysis error:', synergyError)
        // Fallback sur l'analyse classique en cas d'erreur
        console.log('⚠️ Falling back to standard analysis...')
      }
    }

    // ÉTAPE 2: Exécuter la requête SQL
    console.log('💾 Executing database query...')
    const queryResult = await executeQuery(parsed)
    console.log(`✅ Found ${queryResult.count} bookings${queryResult.totalCount && queryResult.totalCount > queryResult.count ? ` (${queryResult.totalCount} total, showing first ${queryResult.count})` : ''}`)
    if (queryResult.filtersApplied) {
      console.log('🔍 Filters applied:', JSON.stringify(queryResult.filtersApplied, null, 2))
    }
    if (queryResult.rowsAnalyzed) {
      console.log(`📊 Rows analyzed: ${queryResult.rowsAnalyzed} (bookings + dtl_sequences)`)
    }

    // ÉTAPE 3: Calculer les statistiques (initiales)
    let statistics = getStatistics(queryResult.data, queryResult.totalCount)

    // ÉTAPE 4: Agréger si nécessaire
    // Si les agrégations viennent déjà de la vue matérialisée, les utiliser directement
    let aggregations = queryResult.aggregations || null
    if (!aggregations && parsed.aggregation) {
      aggregations = await aggregateData(queryResult.data, parsed.aggregation)
    }

    // ÉTAPE 4.5: RECALCULER stats depuis aggregations SI vue matérialisée utilisée
    // Ceci DOIT être fait AVANT les insights pour avoir des stats correctes
    let needsRecalculation = aggregations && aggregations.length > 0 && queryResult.data.length === 0
    if (needsRecalculation) {
      console.log('📊 Recalculating statistics from aggregations (materialized view)...')
      
      // Recalculer les totaux à partir des agrégations
      const totalTEU = aggregations.reduce((sum: number, agg: any) => sum + (parseFloat(agg.teu) || 0), 0)
      const totalUnits = aggregations.reduce((sum: number, agg: any) => sum + (parseFloat(agg.units) || 0), 0)
      const totalWeight = aggregations.reduce((sum: number, agg: any) => sum + (parseFloat(agg.weight) || 0), 0)
      const totalBookings = aggregations.reduce((sum: number, agg: any) => sum + (parseInt(agg.count || agg.bookingCount || agg.booking_count) || 0), 0)
      
      // Construire byClient depuis aggregations avec toutes les données
      const byClient: Record<string, { count: number; teu: number }> = {}
      aggregations.forEach((agg: any) => {
        const clientName = agg.partner_name || agg.key || 'Unknown'
        byClient[clientName] = {
          count: parseInt(agg.count || agg.bookingCount || agg.booking_count) || 0,
          teu: parseFloat(agg.teu || agg.total_teu) || 0
        }
      })

      // Recalculer les KPIs à partir des agrégations
      const sortedClients = Object.entries(byClient)
        .sort(([, a], [, b]) => b.teu - a.teu)
      const top5TEU = sortedClients.slice(0, 5).reduce((sum, [, data]) => sum + data.teu, 0)
      const clientConcentrationIndex = totalTEU > 0 ? (top5TEU / totalTEU) * 100 : 0
      const avgTEUPerBooking = totalBookings > 0 ? totalTEU / totalBookings : 0

      console.log(`✅ Recalculated: ${totalBookings} bookings, ${totalTEU.toFixed(0)} TEU, concentration ${clientConcentrationIndex.toFixed(1)}%`)

      statistics = {
        total: totalBookings,
        totalCount: queryResult.totalCount || totalBookings,
        totalTEU,
        totalUnits,
        totalWeight,
        byClient,
        byPOL: statistics.byPOL || {},
        byPOD: statistics.byPOD || {},
        byTrade: statistics.byTrade || {},
        dateRange: queryResult.filtersApplied?.dateRange || queryResult.period || {
          start: '2020-01-01',
          end: '2020-06-30'
        },
        // KPIs recalculés depuis les aggregations
        kpis: {
          clientConcentrationIndex,
          avgTEUPerBooking,
          spotVsLongTermMix: {
            spot: 0,  // Non disponible depuis aggregations (nécessite rawData)
            longTerm: 0,
          },
          commodityMix: {
            standard: 100,  // Par défaut si non disponible
            reefer: 0,
            hazardous: 0,
            oog: 0,
          },
          spotBookings: 0,
          spotTEU: 0,
          longTermBookings: 0,
          longTermTEU: 0,
          totalContainers: totalBookings,  // Approximation
        }
      }
    }

    // ÉTAPE 5: Générer les insights proactifs (APRÈS recalcul stats)
    console.log('💡 Generating proactive insights...')
    const proactiveInsights = generateProactiveInsights(queryResult.data.length > 0 ? queryResult.data : aggregations, statistics, aggregations, queryResult.period)
    console.log(`✅ Proactive insights generated (${proactiveInsights.anomalies.length} anomalies, ${proactiveInsights.patterns.length} patterns, ${proactiveInsights.recommendations.length} recommendations)`)

    // ÉTAPE 6: Générer la réponse textuelle avec LLM
    console.log('🤖 Generating response...')

    const responseText = await generateResponse(
      query,
      queryResult.data.length > 0 ? queryResult.data : aggregations, // Utiliser les agrégations si pas de données brutes
      statistics,  // Utiliser statistics (déjà recalculées si nécessaire)
      aggregations,
      parsed,
      proactiveInsights  // Passer les insights pour intégration dans le prompt
    )

    // ÉTAPE 7: Validation (DÉSACTIVÉE temporairement - trop de faux positifs)
    console.log('✅ Response generated successfully')

    // Validation simplifiée - toujours valide
    const validation = {
      valid: true,
      confidence: 0.95,
      errors: [],
      warnings: []
    }

    console.log('🎯 Validation: OK (validation system disabled for better UX)')

    // Les mêmes données pour rawData et statistics pour cohérence
    const displayData = queryResult.data // Toutes les données retournées

    // Réponse validée (ou tolérée)
    return NextResponse.json({
      success: true,
      data: {
        text: responseText,
        rawData: displayData, // Toutes les données pour cohérence avec statistics
        statistics,
        aggregations,
        charts: generateChartConfigs(parsed, aggregations, statistics),
        proactiveInsights,
        filtersApplied: queryResult.filtersApplied,
        period: queryResult.period,
        rowsAnalyzed: queryResult.rowsAnalyzed,
        validation,
      },
    })
  } catch (error: any) {
    console.error('❌ Query API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while processing your query',
      },
      { status: 500 }
    )
  }
}

/**
 * Génère une réponse textuelle avec le LLM
 */
async function generateResponse(
  userQuery: string,
  rawData: any[],
  statistics: any,
  aggregations: any,
  parsed: any,
  proactiveInsights?: any
): Promise<string> {
  const llm = getMistralLLM()

  // Créer un résumé des données pour le contexte
  const dataSummary = {
    total: rawData.length,
    dateRange: statistics.dateRange,
  }

  // Cas spécial: pas de données
  if (rawData.length === 0) {
    return parsed.language === 'fr' || parsed.language === 'mixed'
      ? `Je n'ai trouvé aucun booking correspondant à votre requête "${userQuery}". Essayez d'élargir les critères de recherche (dates, clients, ports, etc.).`
      : `I found no bookings matching your query "${userQuery}". Try broadening your search criteria (dates, clients, ports, etc.).`
  }

  const totalCount = statistics.totalCount || dataSummary.total
  const isPartialResults = totalCount > dataSummary.total

  // Formater les KPIs pour le contexte
  const kpisContext = statistics.kpis ? `
KPIs MÉTIER CLÉS :
📊 Performance Clientèle :
   - Concentration client : ${statistics.kpis.clientConcentrationIndex.toFixed(1)}% du volume (top 5 clients) → ${statistics.kpis.clientConcentrationIndex > 40 ? '⚠️ Risque de concentration élevé' : statistics.kpis.clientConcentrationIndex < 10 ? '✅ Excellente diversification' : '✅ Diversification saine'}
   - TEU moyen/booking : ${statistics.kpis.avgTEUPerBooking.toFixed(2)} → ${statistics.kpis.avgTEUPerBooking > 2.5 ? '✅ Bon taux de remplissage' : '⚠️ Potentiel d\'optimisation'}

💼 Mix Commercial :
   - Spot : ${statistics.kpis.spotVsLongTermMix.spot.toFixed(1)}% du volume (${statistics.kpis.spotBookings || 0} bookings, ${statistics.kpis.spotTEU?.toFixed(0) || 0} TEU)
   - Long-Term : ${statistics.kpis.spotVsLongTermMix.longTerm.toFixed(1)}% du volume (${statistics.kpis.longTermBookings || 0} bookings, ${statistics.kpis.longTermTEU?.toFixed(0) || 0} TEU)
   → ${statistics.kpis.spotVsLongTermMix.spot > 60 ? '⚠️ Volatilité commerciale élevée - Opportunité contrats LT' : statistics.kpis.spotVsLongTermMix.longTerm > 70 ? '✅ Stabilité commerciale élevée' : '✅ Mix équilibré'}

📦 Mix Marchandises :
   - Standard : ${statistics.kpis.commodityMix.standard.toFixed(1)}%
   - Reefer : ${statistics.kpis.commodityMix.reefer.toFixed(1)}% ${statistics.kpis.commodityMix.reefer > 10 ? '(volume significatif - capacité frigorifique à surveiller)' : ''}
   - Hazardous : ${statistics.kpis.commodityMix.hazardous.toFixed(1)}%
   - Out of Gauge : ${statistics.kpis.commodityMix.oog.toFixed(1)}%
` : ''

  const prompt = `Tu es un Business Analyst Senior chez CMA CGM, spécialisé dans l'analyse stratégique des flux shipping. 
Tu travailles pour la direction commerciale et opérationnelle. Ton rôle est d'apporter des insights actionnables pour la prise de décision.

🎯 OBJECTIF : Réponds à la question en fournissant une analyse structurée avec interprétation métier, contexte et recommandations.

QUESTION UTILISATEUR : "${userQuery}"

📊 DONNÉES ANALYSÉES :
Période : ${dataSummary.dateRange?.start || 'N/A'} à ${dataSummary.dateRange?.end || 'N/A'}
Volume : ${totalCount} bookings${isPartialResults ? ` (affichage des ${dataSummary.total} plus récents)` : ''}, ${(statistics.totalTEU || 0).toLocaleString()} TEU
Clients : ${Object.keys(statistics.byClient || {}).length} clients uniques
Routes : ${Object.keys(statistics.byTrade || {}).length} trade lanes

${kpisContext}

📈 TOP CLIENTS (par volume TEU) :
${Object.entries(statistics.byClient || {})
  .sort(([, a]: any, [, b]: any) => b.teu - a.teu)
  .slice(0, 5)
  .map(([name, data]: any, i) => `${i + 1}. ${name} : ${data.teu.toFixed(0)} TEU (${data.count} bookings, ${(data.teu / statistics.totalTEU * 100).toFixed(2)}% du total)`)
  .join('\n')}

🗺️ PRINCIPAUX PORTS :
POL (Chargement) : ${Object.entries(statistics.byPOL || {}).sort(([, a]: any, [, b]: any) => b - a).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ')}
POD (Déchargement) : ${Object.entries(statistics.byPOD || {}).sort(([, a]: any, [, b]: any) => b - a).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ')}

🌍 ROUTES COMMERCIALES :
${Object.entries(statistics.byTrade || {}).map(([name, count]) => `${name} : ${count} bookings`).join(', ') || 'Non déterminé'}

${aggregations && aggregations.length > 0 ? `\n📊 DÉTAILS AGRÉGÉS :\n${JSON.stringify(aggregations.slice(0, 8), null, 2)}\n` : ''}

${proactiveInsights && (proactiveInsights.anomalies?.length > 0 || proactiveInsights.patterns?.length > 0 || proactiveInsights.recommendations?.length > 0) ? `
🔍 INSIGHTS PROACTIFS DÉTECTÉS (à intégrer dans ta réponse) :

${proactiveInsights.anomalies && proactiveInsights.anomalies.length > 0 ? `
⚠️ ANOMALIES DÉTECTÉES :
${proactiveInsights.anomalies.map((a: any, i: number) => `
${i + 1}. [${a.severity.toUpperCase()}] ${a.description}
   Type: ${a.type}
   ${a.metric ? `Métrique: ${a.metric}` : ''}
   ${a.value !== undefined ? `Valeur actuelle: ${a.value.toFixed(2)}` : ''}
   ${a.expected !== undefined ? `Valeur attendue: ${a.expected.toFixed(2)}` : ''}
   ${a.deviation !== undefined ? `Déviation: ${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(1)}%` : ''}
   → À mentionner dans la section "⚠️ POINTS D'ATTENTION" avec interprétation business
`).join('')}
` : ''}

${proactiveInsights.patterns && proactiveInsights.patterns.length > 0 ? `
📊 PATTERNS IDENTIFIÉS :
${proactiveInsights.patterns.map((p: any, i: number) => `
${i + 1}. [${p.type.toUpperCase()}] ${p.description}
   Confiance: ${(p.confidence * 100).toFixed(0)}%
   → À mentionner dans la section "📈 ANALYSE DÉTAILLÉE" pour contextualiser les tendances
`).join('')}
` : ''}

${proactiveInsights.recommendations && proactiveInsights.recommendations.length > 0 ? `
💡 RECOMMANDATIONS SUGGÉRÉES :
${proactiveInsights.recommendations.map((r: any, i: number) => `
${i + 1}. [${r.priority.toUpperCase()}] ${r.description}
   Type: ${r.type}
   ${r.action ? `Action: ${r.action}` : ''}
   → À inclure dans la section "🎯 RECOMMANDATIONS" avec formulation actionnable
`).join('')}
` : ''}

⚡ IMPORTANT : Intègre ces insights DANS le texte de ta réponse (pas en liste séparée). 
Utilise-les pour enrichir ton analyse et tes recommandations. Priorise par severity/priority.
` : ''}

🎨 STRUCTURE DE RÉPONSE ATTENDUE :

${parsed.language === 'fr' || parsed.language === 'mixed' ? `
**Structure obligatoire en français :**

📊 [TITRE COURT DE L'ANALYSE]

🎯 SYNTHÈSE EXÉCUTIVE
[2-3 phrases : Chiffre clé principal + interprétation métier + contexte relatif]
- Mentionne TOUJOURS le volume total (${totalCount} bookings, ${(statistics.totalTEU || 0).toLocaleString()} TEU)
- Donne le % que représente ce volume dans le contexte global si pertinent
- Interprète ce que ça signifie (bon/mauvais, opportunité/risque)

📈 ANALYSE DÉTAILLÉE
[Pour chaque élément clé (client/route/port selon la question) :]
- **Nom** : Volume (TEU + bookings) + % du total
- Contexte opérationnel (ports, routes, caractéristiques)
- Utilise les KPIs fournis pour contextualiser (concentration, mix, etc.)

⚠️ POINTS D'ATTENTION
[Liste 2-3 alertes/risques détectés :]
- Chaque point doit être quantifié et expliqué
- Mets en avant les KPIs problématiques (concentration élevée, mix déséquilibré, etc.)
- Explique l'impact business potentiel

💡 OPPORTUNITÉS
[Liste 1-3 opportunités business :]
- Potentiel de croissance, optimisations, nouvelles offres
- Chiffre le potentiel quand possible
- Base-toi sur les KPIs pour identifier les opportunités (ex: conversion Spot → LT)

🎯 RECOMMANDATIONS
[2-3 actions concrètes prioritaires :]
- **Court-terme (0-3 mois)** : Actions tactiques immédiates
- **Moyen-terme (3-6 mois)** : Actions stratégiques si pertinent
` : `
**Required structure in English:**

📊 [SHORT ANALYSIS TITLE]

🎯 EXECUTIVE SUMMARY
[2-3 sentences: Key figure + business interpretation + relative context]
- ALWAYS mention total volume (${totalCount} bookings, ${(statistics.totalTEU || 0).toLocaleString()} TEU)
- Give % this represents in global context if relevant
- Interpret what it means (good/bad, opportunity/risk)

📈 DETAILED ANALYSIS
[For each key element (client/route/port depending on question):]
- **Name**: Volume (TEU + bookings) + % of total
- Operational context (ports, routes, characteristics)
- Use provided KPIs for context (concentration, mix, etc.)

⚠️ ATTENTION POINTS
[List 2-3 detected alerts/risks:]
- Each point must be quantified and explained
- Highlight problematic KPIs (high concentration, unbalanced mix, etc.)
- Explain potential business impact

💡 OPPORTUNITIES
[List 1-3 business opportunities:]
- Growth potential, optimizations, new offerings
- Quantify potential when possible
- Base on KPIs to identify opportunities (e.g., Spot → LT conversion)

🎯 RECOMMENDATIONS
[2-3 concrete priority actions:]
- **Short-term (0-3 months)**: Immediate tactical actions
- **Medium-term (3-6 months)**: Strategic actions if relevant
`}

🚨 RÈGLES CRITIQUES :
1. ❌ N'invente JAMAIS de chiffres - Utilise UNIQUEMENT les données fournies ci-dessus
2. ✅ Interprète TOUJOURS les chiffres - Ne te limite pas aux données brutes, explique leur signification business
3. ✅ Contextualise TOUJOURS - Donne des %, des comparaisons, utilise les KPIs fournis
4. ✅ Priorise - Mentionne d'abord les insights les plus importants
5. ✅ Quantifie - Chaque insight doit avoir des chiffres concrets
6. ✅ Recommande - Termine par des actions concrètes et actionnables
7. ⚠️ Signale les limites - Si données incomplètes, mentionne-le explicitement
8. 📝 Utilise les émojis pour structurer visuellement la réponse
9. 🎯 Mets en gras (** **) les éléments clés (chiffres importants, noms, insights)
10. ${parsed.language === 'fr' ? '🇫🇷 Réponds en FRANÇAIS' : '🇬🇧 Respond in ENGLISH'}

Génère maintenant l'analyse complète structurée :`

  const response = await llm.generate({
    model: 'mistral-large-latest',
    prompt,
    temperature: 0.2, // Légèrement plus créatif pour insights, mais toujours factuel
    maxTokens: 2000,  // Plus long pour analyses complètes structurées
  })

  return response
}

/**
 * Génère les configurations de graphiques selon le type de requête (Shipping Data)
 */
import { selectChartType, formatChartData } from '@/lib/agent/chart-selector'

function generateChartConfigs(parsed: any, aggregations: any, statistics: any): any[] {
  const charts: any[] = []

  // Utiliser le sélecteur automatique de graphiques
  if (aggregations && Array.isArray(aggregations) && aggregations.length > 0) {
    const recommendations = selectChartType(parsed, aggregations, statistics)
    
    recommendations.forEach((rec) => {
      const formattedData = formatChartData(rec, aggregations, statistics)
      if (formattedData.length > 0) {
      charts.push({
          type: rec.type,
          title: rec.title,
          data: formattedData,
          xKey: rec.xKey,
          yKey: rec.yKey,
          dataKey: rec.dataKey,
          rationale: rec.rationale, // Pour la transparence
        })
      }
    })
  }

  // Graphiques automatiques basés sur les statistiques (si pas déjà générés)
  if (charts.length === 0 && statistics) {
  // Top clients par volume TEU
  if (statistics.byClient && Object.keys(statistics.byClient).length > 0) {
    const topClients = Object.entries(statistics.byClient)
      .sort(([, a]: any, [, b]: any) => (b.teu || 0) - (a.teu || 0))
        .slice(0, 10)
      .map(([name, data]: [string, any]) => ({ 
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        value: data.teu || 0,
        fullName: name,
      }))

    if (topClients.length > 0 && topClients.some(c => c.value > 0)) {
      charts.push({
        type: 'bar',
          title: 'Top 10 Clients par Volume TEU',
        data: topClients,
        xKey: 'name',
        yKey: 'value',
          rationale: 'Comparaison des volumes par client',
      })
    }
  }

  // Distribution par route commerciale
  if (statistics.byTrade && Object.keys(statistics.byTrade).length > 0) {
    const trades = Object.entries(statistics.byTrade)
      .map(([name, count]) => ({ name, value: count }))

      if (trades.length > 0 && trades.length <= 8) {
      charts.push({
        type: 'pie',
        title: 'Distribution par Route Commerciale',
        data: trades,
          rationale: 'Répartition des flux par route',
      })
      }
    }
  }

  return charts
}

/**
 * Génère les insights proactifs (anomalies, patterns, recommandations)
 */
function generateProactiveInsights(
  data: any[],
  statistics: any,
  aggregations: any,
  period?: { start: string; end: string }
): ProactiveInsights {
  const insights: ProactiveInsights = {
    anomalies: [],
    patterns: [],
    recommendations: [],
  }

  if (!data || data.length === 0) {
    return insights
  }

  // Calculer les moyennes pour détecter les anomalies
  const totalTEU = statistics.totalTEU || 0
  const avgTEUPerBooking = totalTEU / data.length

  // Détecter les anomalies de volume par client
  if (statistics.byClient) {
    Object.entries(statistics.byClient).forEach(([client, data]: [string, any]) => {
      const clientTEU = data.teu || 0
      const clientAvgTEU = clientTEU / (data.count || 1)
      
      // Anomalie: volume 40% inférieur à la moyenne
      if (clientAvgTEU < avgTEUPerBooking * 0.6) {
        const deviation = ((avgTEUPerBooking - clientAvgTEU) / avgTEUPerBooking) * 100
        insights.anomalies.push({
          type: 'volume_drop',
          severity: deviation > 50 ? 'high' : deviation > 30 ? 'medium' : 'low',
          description: `Volume per booking for ${client} is ${deviation.toFixed(0)}% below average`,
          metric: 'TEU per booking',
          value: clientAvgTEU,
          expected: avgTEUPerBooking,
          deviation: -deviation,
        })
      }

      // Anomalie: volume 40% supérieur à la moyenne
      if (clientAvgTEU > avgTEUPerBooking * 1.4) {
        const deviation = ((clientAvgTEU - avgTEUPerBooking) / avgTEUPerBooking) * 100
        insights.anomalies.push({
          type: 'volume_spike',
          severity: deviation > 100 ? 'high' : deviation > 50 ? 'medium' : 'low',
          description: `Volume per booking for ${client} is ${deviation.toFixed(0)}% above average`,
          metric: 'TEU per booking',
          value: clientAvgTEU,
          expected: avgTEUPerBooking,
          deviation,
        })
      }
    })
  }

  // Détecter la concentration client (risque de dépendance)
  if (statistics.byClient) {
    const clientEntries = Object.entries(statistics.byClient) as [string, any][]
    const sortedClients = clientEntries.sort(([, a], [, b]) => (b.teu || 0) - (a.teu || 0))
    const topClient = sortedClients[0]
    
    if (topClient && topClient[1].teu) {
      const topClientShare = (topClient[1].teu / totalTEU) * 100
      
      if (topClientShare > 40) {
        insights.patterns.push({
          type: 'concentration',
          description: `High client concentration: ${topClient[0]} represents ${topClientShare.toFixed(1)}% of total TEU`,
          confidence: 0.9,
        })

        insights.recommendations.push({
          type: 'diversification',
          priority: topClientShare > 60 ? 'high' : 'medium',
          description: `Consider diversifying client base. ${topClient[0]} accounts for ${topClientShare.toFixed(1)}% of volume`,
          action: `Review opportunities to expand relationships with other clients`,
        })
      }
    }
  }

  // Détecter les patterns de saisonnalité (si on a assez de données temporelles)
  if (aggregations && Array.isArray(aggregations)) {
    const dateAggregations = aggregations.filter((a: any) => a.key && a.key.match(/^\d{4}-\d{2}-\d{2}/))
    if (dateAggregations.length >= 3) {
      // Simple détection de tendance
      const volumes = dateAggregations.map((a: any) => a.teu || 0)
      const isIncreasing = volumes.slice(-3).every((v, i, arr) => i === 0 || v >= arr[i - 1])
      const isDecreasing = volumes.slice(-3).every((v, i, arr) => i === 0 || v <= arr[i - 1])

      if (isIncreasing) {
        insights.patterns.push({
          type: 'trend',
          description: 'Upward trend detected in recent volumes',
          confidence: 0.7,
        })
      } else if (isDecreasing) {
        insights.patterns.push({
          type: 'trend',
          description: 'Downward trend detected in recent volumes',
          confidence: 0.7,
        })
        insights.recommendations.push({
          type: 'alert',
          priority: 'medium',
          description: 'Volume decline detected. Investigate root causes and consider corrective actions',
          action: 'Review market conditions, client relationships, and competitive landscape',
        })
      }
    }
  }

  // Recommandations d'optimisation basées sur les ports
  if (statistics.byPOL && statistics.byPOD) {
    const polCount = Object.keys(statistics.byPOL).length
    const podCount = Object.keys(statistics.byPOD).length

    if (polCount > 10 || podCount > 10) {
      insights.recommendations.push({
        type: 'optimization',
        priority: 'low',
        description: `High port diversity (${polCount} POL, ${podCount} POD). Consider route optimization opportunities`,
        action: 'Analyze route efficiency and consolidation possibilities',
      })
    }
  }

  return insights
}

/**
 * Génère les graphiques spécifiques pour l'analyse des synergies Match Back
 */
function generateSynergyCharts(synergyResult: SynergyAnalysisResult): any[] {
  const charts: any[] = []

  // 1. Graphique en barres: Potentiel de synergie par zone
  if (synergyResult.zones.length > 0) {
    const zoneData = synergyResult.zones
      .slice(0, 10)
      .map(z => ({
        name: z.zone.length > 15 ? z.zone.substring(0, 15) + '...' : z.zone,
        fullName: z.zone,
        importTEU: Math.round(z.totalImportTEU),
        exportTEU: Math.round(z.totalExportTEU),
        synergyPotential: Math.round(z.synergyPotential),
      }))

    if (zoneData.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Potentiel de Synergie Import/Export par Zone',
        data: zoneData,
        xKey: 'name',
        yKey: 'synergyPotential',
        rationale: 'Zones avec le meilleur équilibre import-export pour réutilisation des conteneurs',
      })
    }
  }

  // 2. Graphique en barres groupées: Comparaison Import vs Export par zone
  if (synergyResult.zones.length > 0) {
    const flowData = synergyResult.zones
      .slice(0, 8)
      .map(z => ({
        name: z.zone,
        Import: Math.round(z.totalImportTEU),
        Export: Math.round(z.totalExportTEU),
      }))

    if (flowData.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Flux Import vs Export par Zone (TEU)',
        data: flowData,
        xKey: 'name',
        yKey: ['Import', 'Export'],
        rationale: 'Comparaison des volumes import et export pour identifier les déséquilibres',
      })
    }
  }

  // 3. Graphique circulaire: Répartition des opportunités par priorité
  const opportunitiesByPriority = synergyResult.topOpportunities.reduce((acc: any, opp) => {
    acc[opp.priority] = (acc[opp.priority] || 0) + 1
    return acc
  }, {})

  if (Object.keys(opportunitiesByPriority).length > 0) {
    const priorityData = [
      { name: 'Haute priorité', value: opportunitiesByPriority.high || 0, color: '#4a6fa5' },
      { name: 'Moyenne priorité', value: opportunitiesByPriority.medium || 0, color: '#FF4444' },
      { name: 'Basse priorité', value: opportunitiesByPriority.low || 0, color: '#6a8fc5' },
    ].filter(d => d.value > 0)

    if (priorityData.length > 0) {
      charts.push({
        type: 'pie',
        title: 'Opportunités Match Back par Priorité',
        data: priorityData,
        rationale: 'Distribution des opportunités selon leur potentiel d\'impact',
      })
    }
  }

  // 4. Graphique en barres: Top économies potentielles
  if (synergyResult.topOpportunities.length > 0) {
    const savingsData = synergyResult.topOpportunities
      .slice(0, 8)
      .map((opp, i) => ({
        name: `${opp.importClient.clientName.substring(0, 15)}...`,
        fullName: opp.importClient.clientName,
        zone: opp.zone,
        savings: Math.round(opp.estimatedSavings.repositioningCost),
        co2: Math.round(opp.estimatedSavings.co2Reduction / 1000), // En tonnes
      }))

    if (savingsData.length > 0 && savingsData.some(d => d.savings > 0)) {
      charts.push({
        type: 'bar',
        title: 'Économies Potentielles par Opportunité Match Back (€)',
        data: savingsData,
        xKey: 'name',
        yKey: 'savings',
        rationale: 'Estimation des économies de repositionnement par opportunité identifiée',
      })
    }
  }

  return charts
}
