/**
 * Script de nettoyage de la base de données Supabase
 * Supprime toutes les données existantes pour repartir à zéro
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

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...')
  console.log('⚠️  This will DELETE ALL DATA from the database!')
  console.log('')

  try {
    // Compter les données existantes
    console.log('📊 Counting existing data...')

    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    const { count: labelsCount } = await supabase
      .from('event_labels')
      .select('*', { count: 'exact', head: true })

    const { count: locationsCount } = await supabase
      .from('event_locations')
      .select('*', { count: 'exact', head: true })

    const { count: mediaCount } = await supabase
      .from('event_media')
      .select('*', { count: 'exact', head: true })

    console.log(`   Events: ${eventsCount}`)
    console.log(`   Labels: ${labelsCount}`)
    console.log(`   Locations: ${locationsCount}`)
    console.log(`   Media: ${mediaCount}`)
    console.log('')

    if (eventsCount === 0) {
      console.log('✅ Database is already empty, nothing to clean')
      return
    }

    // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
    console.log('🗑️  Deleting event_labels...')
    const { error: labelsError } = await supabase
      .from('event_labels')
      .delete()
      .neq('event_id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (labelsError) {
      console.error('❌ Error deleting labels:', labelsError)
      throw labelsError
    }
    console.log('   ✅ Labels deleted')

    console.log('🗑️  Deleting event_locations...')
    const { error: locationsError } = await supabase
      .from('event_locations')
      .delete()
      .neq('event_id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (locationsError) {
      console.error('❌ Error deleting locations:', locationsError)
      throw locationsError
    }
    console.log('   ✅ Locations deleted')

    console.log('🗑️  Deleting event_media...')
    const { error: mediaError } = await supabase
      .from('event_media')
      .delete()
      .neq('event_id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (mediaError) {
      console.error('❌ Error deleting media:', mediaError)
      throw mediaError
    }
    console.log('   ✅ Media deleted')

    console.log('🗑️  Deleting events...')
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (eventsError) {
      console.error('❌ Error deleting events:', eventsError)
      throw eventsError
    }
    console.log('   ✅ Events deleted')

    console.log('')
    console.log('✅ Database cleanup completed successfully!')
    console.log('🎯 Ready for new sampling-based ingestion')

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

// Exécuter le nettoyage
cleanupDatabase()
