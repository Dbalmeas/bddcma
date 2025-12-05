/**
 * Script pour ingérer TOUS les fichiers JSONL d'un répertoire
 * Projet Everdian x Albert School
 *
 * Usage:
 *   npm run ingest:all
 */

// Charger les variables d'environnement depuis .env.local
import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { execSync } from 'child_process'
import * as fs from 'fs'

// Chemin vers le répertoire contenant les fichiers JSONL
const DATA_DIR = process.env.DATA_DIR || '/Users/alexismeniante/Desktop/BDD Everdian x Albert School'

console.log('🚀 Ingestion de tous les fichiers JSONL\n')
console.log(`📂 Répertoire: ${DATA_DIR}\n`)

if (!fs.existsSync(DATA_DIR)) {
  console.error(`❌ Répertoire introuvable: ${DATA_DIR}`)
  console.error('Définissez la variable DATA_DIR avec le bon chemin.')
  process.exit(1)
}

// Lister tous les fichiers .jsonl
const files = fs
  .readdirSync(DATA_DIR)
  .filter((file) => file.endsWith('.jsonl'))
  .sort()

if (files.length === 0) {
  console.error('❌ Aucun fichier .jsonl trouvé dans ce répertoire')
  process.exit(1)
}

console.log(`📊 ${files.length} fichiers trouvés:\n`)
files.forEach((file, i) => {
  const filePath = path.join(DATA_DIR, file)
  const stats = fs.statSync(filePath)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1)
  console.log(`   ${i + 1}. ${file} (${sizeMB} MB)`)
})

console.log('\n' + '='.repeat(60))
console.log('Démarrage de l\'ingestion...')
console.log('='.repeat(60) + '\n')

let totalProcessed = 0
let totalErrors = 0
const startTime = Date.now()

// Traiter chaque fichier séquentiellement
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const filePath = path.join(DATA_DIR, file)

  console.log(`\n[${ i + 1}/${files.length}] Traitement de ${file}...`)

  try {
    // Exécuter le script d'ingestion pour ce fichier
    execSync(
      `npx tsx scripts/ingest-data.ts "${filePath}"`,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      }
    )
    totalProcessed++
  } catch (error) {
    console.error(`\n❌ Erreur lors du traitement de ${file}`)
    totalErrors++

    // Demander si on continue
    console.log('\nContinuer avec les fichiers suivants ? (Ctrl+C pour arrêter)')
    // On continue automatiquement
  }
}

// Statistiques finales
const duration = ((Date.now() - startTime) / 60000).toFixed(1)

console.log('\n' + '='.repeat(60))
console.log('📊 RAPPORT FINAL - INGESTION COMPLÈTE')
console.log('='.repeat(60))
console.log(`✅ Fichiers traités avec succès: ${totalProcessed}/${files.length}`)
console.log(`❌ Fichiers en erreur: ${totalErrors}`)
console.log(`⏱️  Durée totale: ${duration} minutes`)
console.log('='.repeat(60))

if (totalErrors > 0) {
  console.log('\n⚠️  Certains fichiers n\'ont pas pu être traités.')
  console.log('Consultez les logs ci-dessus pour plus de détails.')
}

console.log('\n✅ Ingestion terminée!')
console.log('\nVous pouvez maintenant aller sur http://localhost:3000/test-db')
console.log('pour vérifier le nombre d\'événements dans la base.\n')
