/**
 * Test de l'API /api/query pour débugger les réponses
 */

async function testQueryAPI() {
  const testQueries = [
    "Quels sont les top 5 clients en volume TEU en 2020 ?",
    "Quel est le volume TEU depuis la Chine au premier semestre 2020 ?",
  ]

  for (const query of testQueries) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔍 TEST: "${query}"`)
    console.log(`${'='.repeat(80)}\n`)

    try {
      const response = await fetch('http://localhost:3000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('❌ Error:', data.error)
        continue
      }

      console.log('✅ SUCCESS')
      console.log('\n📊 Statistics:')
      console.log(`- Total bookings: ${data.data.statistics.total}`)
      console.log(`- Total TEU: ${data.data.statistics.totalTEU}`)
      console.log(`- Total clients: ${Object.keys(data.data.statistics.byClient || {}).length}`)
      console.log(`- Date range: ${data.data.statistics.dateRange?.start} → ${data.data.statistics.dateRange?.end}`)
      
      if (data.data.statistics.kpis) {
        console.log('\n🎯 KPIs:')
        console.log(`- Concentration client: ${data.data.statistics.kpis.clientConcentrationIndex?.toFixed(1)}%`)
        console.log(`- TEU/booking moyen: ${data.data.statistics.kpis.avgTEUPerBooking?.toFixed(2)}`)
        console.log(`- Spot: ${data.data.statistics.kpis.spotVsLongTermMix?.spot?.toFixed(1)}%`)
        console.log(`- Long-Term: ${data.data.statistics.kpis.spotVsLongTermMix?.longTerm?.toFixed(1)}%`)
      }

      console.log('\n📝 Response Text:')
      console.log(data.data.text.substring(0, 500) + '...')

      if (data.data.aggregations) {
        console.log('\n📊 Top 3 Aggregations:')
        data.data.aggregations.slice(0, 3).forEach((agg: any, i: number) => {
          console.log(`${i + 1}. ${agg.partner_name || agg.key}: ${agg.teu} TEU (${agg.count || agg.bookingCount} bookings)`)
        })
      }

      console.log('\n💡 Proactive Insights:')
      console.log(`- Anomalies: ${data.data.proactiveInsights?.anomalies?.length || 0}`)
      console.log(`- Patterns: ${data.data.proactiveInsights?.patterns?.length || 0}`)
      console.log(`- Recommendations: ${data.data.proactiveInsights?.recommendations?.length || 0}`)

    } catch (error: any) {
      console.error('❌ Fetch error:', error.message)
    }
  }
}

testQueryAPI()
