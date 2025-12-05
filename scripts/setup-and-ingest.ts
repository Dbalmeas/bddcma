import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrdmmvhjfvtqoecrsdjt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Configuration Supabase:');
console.log(`   Projet: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);

// Fonction pour créer les tables via SQL
async function createTables() {
  console.log('\n📋 Création des tables...');
  
  const createTablesSQL = `
-- Table bookings
CREATE TABLE IF NOT EXISTS bookings (
  job_reference TEXT PRIMARY KEY,
  shipcomp_code TEXT,
  shipcomp_name TEXT,
  point_load TEXT,
  point_load_country TEXT,
  point_disch TEXT,
  point_disch_country TEXT,
  origin TEXT,
  destination TEXT,
  booking_confirmation_date DATE,
  cancellation_date DATE,
  job_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table dtl_sequences
CREATE TABLE IF NOT EXISTS dtl_sequences (
  job_reference TEXT NOT NULL,
  job_dtl_sequence INTEGER NOT NULL,
  nb_teu NUMERIC,
  nb_units NUMERIC,
  commodity_description TEXT,
  net_weight NUMERIC,
  haz_flag BOOLEAN DEFAULT FALSE,
  reef_flag BOOLEAN DEFAULT FALSE,
  is_reefer BOOLEAN DEFAULT FALSE,
  oversize_flag BOOLEAN DEFAULT FALSE,
  is_oog BOOLEAN DEFAULT FALSE,
  package_code TEXT,
  commodity_code_lara TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_reference, job_dtl_sequence),
  CONSTRAINT fk_dtl_sequences_booking 
    FOREIGN KEY (job_reference) 
    REFERENCES bookings(job_reference) 
    ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_bookings_shipcomp ON bookings(shipcomp_code);
CREATE INDEX IF NOT EXISTS idx_bookings_point_load ON bookings(point_load);
CREATE INDEX IF NOT EXISTS idx_bookings_point_disch ON bookings(point_disch);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(job_status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_confirmation_date);
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_job_ref ON dtl_sequences(job_reference);
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_commodity ON dtl_sequences(commodity_description);
`;

  // Exécuter le SQL via RPC (si disponible) ou afficher pour exécution manuelle
  try {
    // Essayer d'exécuter via une fonction RPC si elle existe
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (rpcError) {
      // Si RPC n'existe pas, on doit utiliser l'API REST ou exécuter manuellement
      console.log('⚠️  Impossible d\'exécuter le SQL automatiquement via RPC.');
      console.log('📋 Veuillez exécuter ce SQL dans l\'éditeur SQL de Supabase:');
      console.log('\n' + createTablesSQL);
      console.log('\n⏸️  Veuillez exécuter le SQL ci-dessus dans Supabase, puis relancez le script.');
      console.log('   Ou exécutez: npm run ingest:albert (après avoir créé les tables)');
      process.exit(0);
    } else {
      console.log('✅ Tables créées avec succès!');
    }
  } catch (error) {
    console.log('⚠️  Erreur lors de la création automatique des tables.');
    console.log('📋 Veuillez exécuter le SQL dans create-tables.sql ou supabase/migrations/20250103_create_bookings_tables.sql dans Supabase.');
    console.log('   Puis relancez: npm run ingest:albert');
    process.exit(0);
  }
}

// Fonction pour parser une ligne CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1';
}

function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

function parseNumeric(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

async function ingestCSV(filePath: string) {
  console.log('\n📂 Lecture du fichier CSV...');
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let headers: string[] = [];
  const bookingsMap = new Map<string, any>();
  const dtlSequences: any[] = [];

  console.log('🔄 Parsing du fichier...');

  for await (const line of rl) {
    lineNumber++;

    if (lineNumber === 1) {
      headers = parseCSVLine(line);
      console.log(`✅ En-têtes détectés: ${headers.length} colonnes`);
      continue;
    }

    if (line.trim() === '') continue;

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      console.warn(`⚠️  Ligne ${lineNumber}: nombre de colonnes incorrect`);
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const jobReference = row.JOB_REFERENCE_FAKE?.trim();
    if (!jobReference) {
      console.warn(`⚠️  Ligne ${lineNumber}: JOB_REFERENCE_FAKE manquant`);
      continue;
    }

    if (!bookingsMap.has(jobReference)) {
      bookingsMap.set(jobReference, {
        job_reference: jobReference,
        shipcomp_code: row.SHIPCOMP_CODE?.trim() || null,
        shipcomp_name: row.SHIPCOMP_NAME?.trim() || null,
        point_load: row.POINT_LOAD?.trim() || null,
        point_load_country: row.POINT_LOAD_COUNTRY?.trim() || null,
        point_disch: row.POINT_DISCH?.trim() || null,
        point_disch_country: row.POINT_DISCH_COUNTRY?.trim() || null,
        origin: row.ORIGIN?.trim() || null,
        destination: row.DESTINATION?.trim() || null,
        booking_confirmation_date: parseDate(row.BOOKING_CONFIRMATION_DATE),
        cancellation_date: parseDate(row.CANCELLATION_DATE),
        job_status: parseNumeric(row.JOB_STATUS) || null,
      });
    }

    const jobDtlSequence = parseNumeric(row.JOB_DTL_SEQUENCE);
    if (jobDtlSequence !== null) {
      dtlSequences.push({
        job_reference: jobReference,
        job_dtl_sequence: jobDtlSequence,
        nb_teu: parseNumeric(row.NB_TEU),
        nb_units: parseNumeric(row.NB_UNITS),
        commodity_description: row.COMMODITY_DESCRIPTION?.trim() || null,
        net_weight: parseNumeric(row.NET_WEIGHT),
        haz_flag: parseBoolean(row.HAZ_FLAG),
        reef_flag: parseBoolean(row.REEF_FLAG),
        is_reefer: parseBoolean(row.IS_REEFER),
        oversize_flag: parseBoolean(row.OVERSIZE_FLAG),
        is_oog: parseBoolean(row.IS_OOG),
        package_code: row.PACKAGE_CODE?.trim() || null,
        commodity_code_lara: row.COMMODITY_CODE_LARA?.trim() || null,
      });
    }

    if (lineNumber % 1000 === 0) {
      console.log(`  📊 ${lineNumber} lignes traitées...`);
    }
  }

  console.log(`\n✅ Parsing terminé:`);
  console.log(`   - ${bookingsMap.size} bookings uniques`);
  console.log(`   - ${dtlSequences.length} séquences de détail`);

  // Insérer les bookings
  console.log('\n📤 Insertion des bookings dans Supabase...');
  const bookingsArray = Array.from(bookingsMap.values());
  
  const batchSize = 1000;
  for (let i = 0; i < bookingsArray.length; i += batchSize) {
    const batch = bookingsArray.slice(i, i + batchSize);
    const { error } = await supabase
      .from('bookings')
      .upsert(batch, { onConflict: 'job_reference' });
    
    if (error) {
      console.error(`❌ Erreur lors de l'insertion des bookings (batch ${i / batchSize + 1}):`, error);
      throw error;
    }
    console.log(`   ✅ ${Math.min(i + batchSize, bookingsArray.length)}/${bookingsArray.length} bookings insérés`);
  }

  // Insérer les dtl_sequences
  console.log('\n📤 Insertion des dtl_sequences dans Supabase...');
  for (let i = 0; i < dtlSequences.length; i += batchSize) {
    const batch = dtlSequences.slice(i, i + batchSize);
    const { error } = await supabase
      .from('dtl_sequences')
      .upsert(batch, { onConflict: 'job_reference,job_dtl_sequence' });
    
    if (error) {
      console.error(`❌ Erreur lors de l'insertion des dtl_sequences (batch ${i / batchSize + 1}):`, error);
      throw error;
    }
    console.log(`   ✅ ${Math.min(i + batchSize, dtlSequences.length)}/${dtlSequences.length} séquences insérées`);
  }

  console.log('\n🎉 Import terminé avec succès!');
  console.log(`   - ${bookingsArray.length} bookings`);
  console.log(`   - ${dtlSequences.length} dtl_sequences`);
}

// Exécution principale
async function main() {
  try {
    // Créer les tables d'abord
    await createTables();
    
    // Vérifier que les tables existent
    const { error: checkError } = await supabase
      .from('bookings')
      .select('job_reference')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST116') {
      console.error('❌ Les tables n\'existent toujours pas. Veuillez les créer manuellement.');
      process.exit(1);
    }
    
    // Ingérer les données
    const csvPath = path.join(__dirname, '..', 'Albert School Sample 20k.csv');
    await ingestCSV(csvPath);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();

