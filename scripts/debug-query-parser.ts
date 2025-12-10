/**
 * Debug du query parser pour voir ce qui est extrait
 */

import { parseQuery } from '../lib/agent/query-parser'
import { initMistralLLM } from '../lib/agent/mistral-llm'

async function debugParser() {
  // Init Mistral
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    console.error('❌ MISTRAL_API_KEY not set')
    return
  }
  initMistralLLM(apiKey)

  const testQueries = [
    "Quels sont les top 5 clients en volume TEU en 2020 ?",
    "Quel est le volume TEU depuis la Chine au premier semestre 2020 ?",
  ]

  for (const query of testQueries) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔍 PARSING: "${query}"`)
    console.log(`${'='.repeat(80)}\n`)

    try {
      const parsed = await parseQuery(query, [])
      console.log('✅ Parsed Query:')
      console.log(JSON.stringify(parsed, null, 2))
    } catch (error: any) {
      console.error('❌ Parse error:', error.message)
    }
  }
}

debugParser()
