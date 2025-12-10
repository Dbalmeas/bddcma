#!/usr/bin/env tsx

/**
 * Test script pour vérifier toutes les questions suggérées
 * Compare les résultats avec les attentes du PDF CMA CGM
 */

const suggestedQuestions = [
  "Quel est le volume TEU depuis la Chine au premier semestre 2020 ?",
  "Quels sont les principaux clients pour les routes vers les EAU ?",
  "Analyse des volumes par port chinois (Ningbo, Shanghai, Qingdao)",
  "Évolution mensuelle des volumes TEU entre janvier et juin 2020",
  "Comparaison des volumes 2019 vs 2020 (premier semestre)",
  "Quels sont les top 5 clients en volume TEU sur 2020 ?",
]

async function testQuestion(question: string, index: number) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📝 Question ${index + 1}/${suggestedQuestions.length}: "${question}"`)
  console.log('='.repeat(80))

  const startTime = Date.now()

  try {
    const response = await fetch('http://localhost:3000/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        conversationHistory: [],
      }),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json()
      console.log(`❌ ÉCHEC (${duration}ms)`)
      console.log(`   Erreur: ${errorData.error || response.statusText}`)
      return {
        question,
        success: false,
        duration,
        error: errorData.error || response.statusText,
      }
    }

    const data = await response.json()

    console.log(`✅ SUCCÈS (${duration}ms)`)
    console.log(`   Parsed intent: ${data.parsed?.intent}`)
    console.log(`   Output format: ${data.parsed?.outputFormat}`)
    console.log(`   Aggregation: ${data.parsed?.aggregation?.groupBy || 'none'} by ${data.parsed?.aggregation?.metric || 'none'}`)
    console.log(`   Date range: ${data.parsed?.filters?.dateRange?.start || 'none'} to ${data.parsed?.filters?.dateRange?.end || 'none'}`)
    console.log(`   Filters: ${JSON.stringify(data.filtersApplied || {})}`)

    if (data.aggregations) {
      console.log(`   📊 Aggregations returned: ${data.aggregations.length} results`)
      console.log(`   Top 3:`)
      data.aggregations.slice(0, 3).forEach((agg: any, i: number) => {
        console.log(`      ${i + 1}. ${agg.partner_name || agg.key || 'Unknown'}: ${agg.teu?.toFixed(0) || 0} TEU`)
      })
    }

    if (data.statistics) {
      console.log(`   📈 Statistics:`)
      console.log(`      Total TEU: ${data.statistics.totalTEU?.toLocaleString()}`)
      console.log(`      Total bookings: ${data.statistics.total}`)
    }

    console.log(`   💬 Response preview: ${data.response?.substring(0, 150)}...`)

    return {
      question,
      success: true,
      duration,
      data,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.log(`❌ EXCEPTION (${duration}ms)`)
    console.log(`   Error: ${error.message}`)
    return {
      question,
      success: false,
      duration,
      error: error.message,
    }
  }
}

async function main() {
  console.log('🧪 Test des Questions Suggérées - CMA CGM Talk to Data')
  console.log('=' .repeat(80))
  console.log(`\n📋 ${suggestedQuestions.length} questions à tester\n`)

  const results = []

  for (let i = 0; i < suggestedQuestions.length; i++) {
    const result = await testQuestion(suggestedQuestions[i], i)
    results.push(result)

    // Pause entre les requêtes
    if (i < suggestedQuestions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // Résumé
  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 RÉSUMÉ DES TESTS')
  console.log('='.repeat(80))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length

  console.log(`\n✅ Succès: ${successful}/${results.length} (${(successful / results.length * 100).toFixed(0)}%)`)
  console.log(`❌ Échecs: ${failed}/${results.length}`)
  console.log(`⏱️  Durée moyenne: ${avgDuration.toFixed(0)}ms\n`)

  if (failed > 0) {
    console.log('\n❌ Questions en échec:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • "${r.question}"`)
      console.log(`     Erreur: ${r.error}`)
    })
  }

  if (successful > 0) {
    console.log('\n✅ Questions réussies:')
    results.filter(r => r.success).forEach(r => {
      console.log(`   • "${r.question}" (${r.duration}ms)`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log(`🎯 Taux de réussite: ${(successful / results.length * 100).toFixed(0)}%`)
  console.log('='.repeat(80) + '\n')
}

main().catch(console.error)
