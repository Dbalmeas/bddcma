/**
 * Script d'ingestion de TOUS les fichiers JSONL avec ÉCHANTILLONNAGE
 * 200 événements par fichier maximum
 * Projet Everdian x Albert School
 */

// Charger les variables d'environnement depuis .env.local
import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as readline from 'readline'

// Configuration
const BATCH_SIZE = 100
const MAX_EVENTS_PER_FILE = 200 // 🎯 LIMITE: 200 événements par fichier
const DATA_DIR = '/Users/alexismeniante/Desktop/BDD Everdian x Albert School'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement manquantes!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types (copié de ingest-data-sampled.ts)
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

// Statistiques globales
let globalStats = {
  totalFiles: 0,
  successfulFiles: 0,
  failedFiles: 0,
  totalEvents: 0,
  totalLines: 0,
  skippedEvents: 0,
  errors: 0,
  startTime: Date.now(),
}

/**
 * Transforme un événement brut
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

  result.events.push({
    id: raw.id,
    text: raw.text || '',
    english_sentence: raw.english_sentence || null,
    lang: raw.lang || null,
    publish_date: raw.publish_date || null,
    network: raw.network || null,
    url: raw.url || null,
  })

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

  if (raw.images && Array.isArray(raw.images)) {
    raw.images.forEach((url) => {
      result.media.push({
        event_id: raw.id,
        media_type: 'image',
        url,
      })
    })
  }

  if (raw.videos && Array.isArray(raw.videos)) {
    raw.videos.forEach((url) => {
      result.media.push({
        event_id: raw.id,
        media_type: 'video',
        url,
      })
    })
  }

  if (raw.user?.userName) {
    result.users.push({
      event_id: raw.id,
      username: raw.user.userName,
    })

    if (raw.user.metrics && Array.isArray(raw.user.metrics)) {
      raw.user.metrics.forEach((metric) => {
        result.metrics.push({
          event_id: raw.id,
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
 * Insère un batch
 */
async function insertBatch(batch: TransformedData) {
  try {
    if (batch.events.length > 0) {
      const { error: eventsError } = await supabase
        .from('events')
        .upsert(batch.events, { onConflict: 'id', ignoreDuplicates: true })
      if (eventsError) throw eventsError
    }

    if (batch.labels.length > 0) {
      await supabase
        .from('event_labels')
        .insert(batch.labels, { ignoreDuplicates: true })
    }

    if (batch.locations.length > 0) {
      const validLocations = batch.locations.filter((loc) => {
        if (!loc.coordinates) return true
        return loc.coordinates.match(/^POINT\(-?\d+\.?\d* -?\d+\.?\d*\)$/)
      })
      await supabase
        .from('event_locations')
        .insert(validLocations, { ignoreDuplicates: true })
    }

    if (batch.media.length > 0) {
      await supabase
        .from('event_media')
        .insert(batch.media, { ignoreDuplicates: true })
    }

    if (batch.users.length > 0) {
      await supabase
        .from('event_users')
        .insert(batch.users, { ignoreDuplicates: true })

      if (batch.metrics.length > 0) {
        const usernames = [...new Set(batch.metrics.map((m) => m.username))]
        const { data: users } = await supabase
          .from('event_users')
          .select('id, username, event_id')
          .in('username', usernames)

        if (users && users.length > 0) {
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

    globalStats.totalEvents += batch.events.length
  } catch (error) {
    globalStats.errors++
    throw error
  }
}

/**
 * Traite un fichier avec échantillonnage
 */
async function processFile(filePath: string): Promise<boolean> {
  const fileName = path.basename(filePath)
  globalStats.totalFiles++

  console.log(`\n📂 [${globalStats.totalFiles}] ${fileName}`)
  console.log(`   📊 Limite: ${MAX_EVENTS_PER_FILE} événements`)

  try {
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
    let eventsFromThisFile = 0

    for await (const line of rl) {
      if (!line.trim()) continue

      // 🎯 ARRÊTER si limite atteinte
      if (eventsFromThisFile >= MAX_EVENTS_PER_FILE) {
        break
      }

      lineCount++
      globalStats.totalLines++

      try {
        const raw: RawEvent = JSON.parse(line)
        const transformed = transformEvent(raw)

        batch.events.push(...transformed.events)
        batch.labels.push(...transformed.labels)
        batch.locations.push(...transformed.locations)
        batch.media.push(...transformed.media)
        batch.users.push(...transformed.users)
        batch.metrics.push(...transformed.metrics)

        eventsFromThisFile++

        if (batch.events.length >= BATCH_SIZE) {
          await insertBatch(batch)
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
        globalStats.skippedEvents++
      }
    }

    // Insérer le reste
    if (batch.events.length > 0) {
      await insertBatch(batch)
    }

    console.log(`   ✅ ${eventsFromThisFile} événements importés`)
    globalStats.successfulFiles++
    return true

  } catch (error: any) {
    console.error(`   ❌ Erreur: ${error.message}`)
    globalStats.failedFiles++
    return false
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Ingestion ÉCHANTILLONNÉE de TOUS les fichiers\n')
  console.log(`📊 Configuration:`)
  console.log(`   - Répertoire: ${DATA_DIR}`)
  console.log(`   - Batch size: ${BATCH_SIZE}`)
  console.log(`   - 🎯 MAX par fichier: ${MAX_EVENTS_PER_FILE} événements`)
  console.log('')

  // Vérifier que le dossier data existe
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Dossier introuvable: ${DATA_DIR}`)
    process.exit(1)
  }

  // Tester connexion Supabase
  try {
    const { error } = await supabase.from('events').select('count').limit(1)
    if (error) throw error
    console.log('✅ Connexion Supabase OK\n')
  } catch (error: any) {
    console.error('❌ Erreur de connexion Supabase:', error.message)
    process.exit(1)
  }

  // Lister tous les fichiers .jsonl
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(DATA_DIR, f))
    .sort()

  if (files.length === 0) {
    console.error('❌ Aucun fichier .jsonl trouvé dans le dossier data/')
    process.exit(1)
  }

  console.log(`📁 ${files.length} fichiers trouvés\n`)
  console.log(`🎯 Estimation: ${files.length} × ${MAX_EVENTS_PER_FILE} = ~${files.length * MAX_EVENTS_PER_FILE} événements\n`)

  // Traiter chaque fichier
  for (const file of files) {
    await processFile(file)

    // Afficher progression globale
    const elapsed = ((Date.now() - globalStats.startTime) / 1000).toFixed(1)
    const rate = (globalStats.totalEvents / (Date.now() - globalStats.startTime) * 1000).toFixed(0)
    console.log(
      `   📈 Total: ${globalStats.totalEvents.toLocaleString()} événements | ` +
      `${rate}/s | ${elapsed}s`
    )
  }

  // Statistiques finales
  const duration = ((Date.now() - globalStats.startTime) / 1000 / 60).toFixed(1)
  const avgRate = (globalStats.totalEvents / (Date.now() - globalStats.startTime) * 1000).toFixed(0)

  console.log('\n' + '='.repeat(70))
  console.log('📊 STATISTIQUES FINALES - INGESTION ÉCHANTILLONNÉE')
  console.log('='.repeat(70))
  console.log(`📁 Fichiers traités: ${globalStats.totalFiles}`)
  console.log(`   ✅ Succès: ${globalStats.successfulFiles}`)
  console.log(`   ❌ Échecs: ${globalStats.failedFiles}`)
  console.log(`✅ Événements importés: ${globalStats.totalEvents.toLocaleString()}`)
  console.log(`⏭️  Événements ignorés: ${globalStats.skippedEvents.toLocaleString()}`)
  console.log(`❌ Erreurs: ${globalStats.errors}`)
  console.log(`⏱️  Durée totale: ${duration} min`)
  console.log(`📈 Vitesse moyenne: ${avgRate} événements/s`)
  console.log('='.repeat(70))
  console.log(`\n🎯 Base de données prête avec ~${globalStats.totalEvents} événements échantillonnés`)
}

main().catch(console.error)
