#!/usr/bin/env tsx

async function analyzeResponse() {
  console.log('🔍 Analyse détaillée d\'une réponse\n')
  console.log('Question: "Quels sont les top 5 clients en volume TEU sur 2020 ?"\n')

  const response = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: "Quels sont les top 5 clients en volume TEU sur 2020 ?",
      conversationHistory: [],
    }),
  })

  const data = await response.json()

  console.log('📦 Structure complète de la réponse:\n')
  console.log(JSON.stringify(data, null, 2))

  console.log('\n\n📊 Analyse des champs importants:\n')

  console.log('1. Success:', data.success)
  console.log('2. Response text length:', data.response?.length)
  console.log('3. Has aggregations:', !!data.aggregations)
  console.log('4. Aggregations count:', data.aggregations?.length || 0)
  console.log('5. Has statistics:', !!data.statistics)
  console.log('6. Has charts:', !!data.charts)
  console.log('7. Charts count:', data.charts?.length || 0)

  if (data.aggregations && data.aggregations.length > 0) {
    console.log('\n📊 Top 5 résultats d\'agrégation:')
    data.aggregations.slice(0, 5).forEach((agg: any, i: number) => {
      console.log(`   ${i + 1}. ${agg.partner_name || agg.key}: ${agg.teu} TEU, ${agg.count} bookings`)
    })
  }

  if (data.statistics) {
    console.log('\n📈 Statistiques:')
    console.log(`   Total TEU: ${data.statistics.totalTEU}`)
    console.log(`   Total bookings: ${data.statistics.total}`)
    console.log(`   Date range: ${data.statistics.dateRange?.start} to ${data.statistics.dateRange?.end}`)
  }

  console.log('\n💬 Réponse LLM:')
  console.log(data.response)
}

analyzeResponse().catch(console.error)
