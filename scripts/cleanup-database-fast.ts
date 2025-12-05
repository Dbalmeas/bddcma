/**
 * Script de nettoyage rapide de la base de données Supabase
 * Utilise TRUNCATE CASCADE pour supprimer rapidement toutes les données
 */

import { config } from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupDatabaseFast() {
  console.log('🧹 Starting FAST database cleanup with TRUNCATE...')
  console.log('⚠️  This will DELETE ALL DATA from the database!')
  console.log('')

  try {
    // Compter les données existantes
    console.log('📊 Counting existing data...')

    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    console.log(`   Events: ${eventsCount}`)
    console.log('')

    if (eventsCount === 0) {
      console.log('✅ Database is already empty, nothing to clean')
      return
    }

    // Utiliser TRUNCATE CASCADE pour une suppression rapide
    console.log('🗑️  Executing TRUNCATE CASCADE on all tables...')
    console.log('   This will be much faster than DELETE...')

    // TRUNCATE supprime toutes les lignes instantanément et réinitialise les séquences
    const { error } = await supabase.rpc('cleanup_all_events', {})

    if (error) {
      // Si la fonction n'existe pas, essayons une autre approche
      if (error.code === '42883') {
        console.log('   Function not found, trying alternative method...')

        // Méthode alternative: supprimer par lots
        await cleanupInBatches()
      } else {
        console.error('❌ Error during cleanup:', error)
        throw error
      }
    } else {
      console.log('   ✅ All data truncated successfully')
    }

    console.log('')
    console.log('✅ Database cleanup completed!')
    console.log('🎯 Ready for new sampling-based ingestion')

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error)
    console.log('')
    console.log('💡 Alternative: You can manually run this SQL in Supabase SQL Editor:')
    console.log('   TRUNCATE TABLE event_labels, event_locations, event_media, events CASCADE;')
    process.exit(1)
  }
}

/**
 * Méthode alternative: suppression par lots
 */
async function cleanupInBatches() {
  console.log('📦 Cleaning up in batches...')

  // Supprimer les tables liées d'abord
  const tables = ['event_labels', 'event_locations', 'event_media']

  for (const table of tables) {
    console.log(`   Deleting from ${table}...`)
    let deleted = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1000)

      if (error) throw error

      if (!data || data.length === 0) {
        hasMore = false
        break
      }

      const ids = data.map(row => row.id)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .in('id', ids)

      if (deleteError) throw deleteError

      deleted += ids.length
      console.log(`   Deleted ${deleted} rows from ${table}...`)

      // Petit délai pour éviter de surcharger la DB
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`   ✅ ${table} cleaned (${deleted} rows)`)
  }

  // Maintenant supprimer les events
  console.log('   Deleting events...')
  let deleted = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1000)

    if (error) throw error

    if (!data || data.length === 0) {
      hasMore = false
      break
    }

    const ids = data.map(row => row.id)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .in('id', ids)

    if (deleteError) throw deleteError

    deleted += ids.length
    console.log(`   Deleted ${deleted} events...`)

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`   ✅ events cleaned (${deleted} rows)`)
}

// Exécuter le nettoyage
cleanupDatabaseFast()
