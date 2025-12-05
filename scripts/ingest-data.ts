/**
 * Script d'ingestion des données JSONL vers Supabase
 * Projet Everdian x Albert School
 *
 * Usage:
 *   npm run ingest -- <chemin-vers-fichier.jsonl>
 *   npm run ingest:all  (pour tous les fichiers)
 */

// Charger les variables d'environnement depuis .env.local
import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as readline from 'readline'

// Configuration
const BATCH_SIZE = 500 // Nombre d'événements par batch
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement manquantes!')
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types
interface RawEvent {
  id: string
  text: string
  english_sentence?: string
  lang?: string
  labels_v2?: Array<{
    type: string
    value: string
    score: number
  }>
  publish_date?: string
  locations?: {
    mentions?: Array<any>
    inferred?: Array<any>
    post?: Array<any>
  }
  images?: string[]
  videos?: string[]
  url?: string
  user?: {
    userName?: string
    metrics?: Array<{
      metricName: string
      metricCount: number
    }>
  }
  network?: string
}

interface TransformedData {
  events: any[]
  labels: any[]
  locations: any[]
  media: any[]
  users: any[]
  metrics: any[]
}

// Statistiques
let stats = {
  totalLines: 0,
  processedEvents: 0,
  skippedEvents: 0,
  errors: 0,
  startTime: Date.now(),
  currentFile: '',
}

/**
 * Transforme un événement brut JSONL en format Supabase
 */
function transformEvent(raw: RawEvent): TransformedData {
  const result: TransformedData = {
    events: [],
    labels: [],
    locations: [],
    media: [],
    users: [],
    metrics: [],
  }

  // Event principal
  result.events.push({
    id: raw.id,
    text: raw.text || '',
    english_sentence: raw.english_sentence || null,
    lang: raw.lang || null,
    publish_date: raw.publish_date || null,
    network: raw.network || null,
    url: raw.url || null,
  })

  // Labels
  if (raw.labels_v2 && Array.isArray(raw.labels_v2)) {
    raw.labels_v2.forEach((label) => {
      result.labels.push({
        event_id: raw.id,
        type: label.type,
        value: label.value,
        score: label.score,
      })
    })
  }

  // Locations (mentions)
  if (raw.locations?.mentions && Array.isArray(raw.locations.mentions)) {
    raw.locations.mentions.forEach((loc) => {
      result.locations.push({
        event_id: raw.id,
        location_type: 'mention',
        name: loc.name || null,
        label: loc.label || null,
        layer: loc.layer || null,
        country: loc.country || null,
        coordinates: loc.coordinates
          ? `POINT(${loc.coordinates[0]} ${loc.coordinates[1]})`
          : null,
      })
    })
  }

  // Locations (inferred)
  if (raw.locations?.inferred && Array.isArray(raw.locations.inferred)) {
    raw.locations.inferred.forEach((loc) => {
      result.locations.push({
        event_id: raw.id,
        location_type: 'inferred',
        name: loc.name || null,
        label: loc.label || null,
        layer: loc.layer || null,
        country: loc.country || null,
        coordinates: loc.coordinates
          ? `POINT(${loc.coordinates[0]} ${loc.coordinates[1]})`
          : null,
      })
    })
  }

  // Locations (post)
  if (raw.locations?.post && Array.isArray(raw.locations.post)) {
    raw.locations.post.forEach((loc) => {
      result.locations.push({
        event_id: raw.id,
        location_type: 'post',
        name: loc.name || null,
        label: loc.label || null,
        layer: loc.layer || null,
        country: loc.country || null,
        coordinates: loc.coordinates
          ? `POINT(${loc.coordinates[0]} ${loc.coordinates[1]})`
          : null,
      })
    })
  }

  // Media (images)
  if (raw.images && Array.isArray(raw.images)) {
    raw.images.forEach((url) => {
      result.media.push({
        event_id: raw.id,
        media_type: 'image',
        url,
      })
    })
  }

  // Media (videos)
  if (raw.videos && Array.isArray(raw.videos)) {
    raw.videos.forEach((url) => {
      result.media.push({
        event_id: raw.id,
        media_type: 'video',
        url,
      })
    })
  }

  // User
  if (raw.user?.userName) {
    result.users.push({
      event_id: raw.id,
      username: raw.user.userName,
    })

    // User metrics (on les ajoutera après avoir l'ID de l'utilisateur)
    if (raw.user.metrics && Array.isArray(raw.user.metrics)) {
      raw.user.metrics.forEach((metric) => {
        result.metrics.push({
          event_id: raw.id, // On stocke temporairement l'event_id
          username: raw.user!.userName,
          metric_name: metric.metricName,
          metric_count: metric.metricCount,
        })
      })
    }
  }

  return result
}

/**
 * Insère un batch de données dans Supabase
 */
async function insertBatch(batch: TransformedData) {
  try {
    // 1. Insérer les events
    if (batch.events.length > 0) {
      const { error: eventsError } = await supabase
        .from('events')
        .upsert(batch.events, { onConflict: 'id', ignoreDuplicates: true })

      if (eventsError) {
        console.error('Erreur insertion events:', eventsError.message)
        throw eventsError
      }
    }

    // 2. Insérer les labels
    if (batch.labels.length > 0) {
      const { error: labelsError } = await supabase
        .from('event_labels')
        .insert(batch.labels, { ignoreDuplicates: true })

      if (labelsError && !labelsError.message.includes('duplicate')) {
        console.error('Erreur insertion labels:', labelsError.message)
      }
    }

    // 3. Insérer les locations
    if (batch.locations.length > 0) {
      // Filtrer les locations avec coordonnées valides
      const validLocations = batch.locations.filter((loc) => {
        if (!loc.coordinates) return true // On garde celles sans coordonnées
        // Vérifier que c'est un format valide
        return loc.coordinates.match(/^POINT\(-?\d+\.?\d* -?\d+\.?\d*\)$/)
      })

      const { error: locationsError } = await supabase
        .from('event_locations')
        .insert(validLocations, { ignoreDuplicates: true })

      if (locationsError && !locationsError.message.includes('duplicate')) {
        console.error('Erreur insertion locations:', locationsError.message)
      }
    }

    // 4. Insérer les media
    if (batch.media.length > 0) {
      const { error: mediaError } = await supabase
        .from('event_media')
        .insert(batch.media, { ignoreDuplicates: true })

      if (mediaError && !mediaError.message.includes('duplicate')) {
        console.error('Erreur insertion media:', mediaError.message)
      }
    }

    // 5. Insérer les users
    if (batch.users.length > 0) {
      const { error: usersError } = await supabase
        .from('event_users')
        .insert(batch.users, { ignoreDuplicates: true })

      if (usersError && !usersError.message.includes('duplicate')) {
        console.error('Erreur insertion users:', usersError.message)
      }

      // 6. Récupérer les IDs des users et insérer les metrics
      if (batch.metrics.length > 0) {
        // Grouper par username pour récupérer les IDs
        const usernames = [...new Set(batch.metrics.map((m) => m.username))]
        const { data: users } = await supabase
          .from('event_users')
          .select('id, username, event_id')
          .in('username', usernames)

        if (users && users.length > 0) {
          // Mapper les metrics avec les bons user_id
          const metricsWithIds = batch.metrics
            .map((metric) => {
              const user = users.find(
                (u) => u.username === metric.username && u.event_id === metric.event_id
              )
              if (!user) return null
              return {
                user_id: user.id,
                metric_name: metric.metric_name,
                metric_count: metric.metric_count,
              }
            })
            .filter(Boolean)

          if (metricsWithIds.length > 0) {
            await supabase
              .from('user_metrics')
              .insert(metricsWithIds, { ignoreDuplicates: true })
          }
        }
      }
    }

    stats.processedEvents += batch.events.length
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion du batch:', error)
    stats.errors++
    throw error
  }
}

/**
 * Traite un fichier JSONL
 */
async function processFile(filePath: string): Promise<void> {
  stats.currentFile = path.basename(filePath)
  console.log(`\n📂 Traitement de ${stats.currentFile}...`)

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let batch: TransformedData = {
    events: [],
    labels: [],
    locations: [],
    media: [],
    users: [],
    metrics: [],
  }

  let lineCount = 0

  for await (const line of rl) {
    if (!line.trim()) continue

    lineCount++
    stats.totalLines++

    try {
      const raw: RawEvent = JSON.parse(line)

      // Transformer l'événement
      const transformed = transformEvent(raw)

      // Ajouter au batch
      batch.events.push(...transformed.events)
      batch.labels.push(...transformed.labels)
      batch.locations.push(...transformed.locations)
      batch.media.push(...transformed.media)
      batch.users.push(...transformed.users)
      batch.metrics.push(...transformed.metrics)

      // Insérer le batch si on a atteint la taille limite
      if (batch.events.length >= BATCH_SIZE) {
        await insertBatch(batch)

        // Afficher progression
        const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1)
        const rate = (stats.processedEvents / (Date.now() - stats.startTime) * 1000).toFixed(0)
        console.log(
          `  ✓ ${stats.processedEvents.toLocaleString()} événements | ` +
          `${rate}/s | ${elapsed}s`
        )

        // Réinitialiser le batch
        batch = {
          events: [],
          labels: [],
          locations: [],
          media: [],
          users: [],
          metrics: [],
        }
      }
    } catch (error) {
      console.error(`Erreur ligne ${lineCount}:`, error)
      stats.skippedEvents++
    }
  }

  // Insérer le dernier batch s'il reste des données
  if (batch.events.length > 0) {
    await insertBatch(batch)
  }

  console.log(`  ✅ ${stats.currentFile} terminé (${lineCount.toLocaleString()} lignes)`)
}

/**
 * Point d'entrée principal
 */
async function main() {
  console.log('🚀 Démarrage de l\'ingestion des données...\n')
  console.log(`📊 Configuration:`)
  console.log(`   - Supabase URL: ${SUPABASE_URL}`)
  console.log(`   - Batch size: ${BATCH_SIZE}`)
  console.log('')

  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Usage: npm run ingest -- <fichier.jsonl>')
    console.error('   ou: npm run ingest:all')
    process.exit(1)
  }

  const filePath = args[0]

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable: ${filePath}`)
    process.exit(1)
  }

  try {
    // Tester la connexion Supabase
    const { error } = await supabase.from('events').select('count').limit(1)
    if (error) {
      console.error('❌ Erreur de connexion Supabase:', error.message)
      console.error('Assurez-vous que le schéma SQL a été exécuté.')
      process.exit(1)
    }

    console.log('✅ Connexion Supabase OK\n')

    // Traiter le fichier
    await processFile(filePath)

    // Afficher statistiques finales
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1)
    const avgRate = (stats.processedEvents / (Date.now() - stats.startTime) * 1000).toFixed(0)

    console.log('\n' + '='.repeat(60))
    console.log('📊 STATISTIQUES FINALES')
    console.log('='.repeat(60))
    console.log(`✅ Événements traités: ${stats.processedEvents.toLocaleString()}`)
    console.log(`⏭️  Événements ignorés: ${stats.skippedEvents.toLocaleString()}`)
    console.log(`❌ Erreurs: ${stats.errors}`)
    console.log(`⏱️  Durée totale: ${duration}s`)
    console.log(`📈 Vitesse moyenne: ${avgRate} événements/s`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error)
    process.exit(1)
  }
}

// Exécution
main().catch(console.error)
