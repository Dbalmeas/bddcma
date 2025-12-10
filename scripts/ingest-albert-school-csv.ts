import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrdmmvhjfvtqoecrsdjt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔍 Configuration Supabase:');
console.log(`   URL: ${supabaseUrl ? '✅' : '❌'} ${supabaseUrl || 'MANQUANTE'}`);
console.log(`   Key: ${supabaseKey ? '✅' : '❌'} ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MANQUANTE'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('   Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et (SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY) sont définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  SHIPCOMP_CODE: string;
  SHIPCOMP_NAME: string;
  JOB_REFERENCE_FAKE: string;
  JOB_DTL_SEQUENCE: string;
  JOB_STATUS: string;
  POINT_LOAD: string;
  POINT_LOAD_COUNTRY: string;
  POINT_DISCH: string;
  POINT_DISCH_COUNTRY: string;
  ORIGIN: string;
  DESTINATION: string;
  BOOKING_CONFIRMATION_DATE: string;
  CANCELLATION_DATE: string;
  NB_UNITS: string;
  NB_TEU: string;
  NET_WEIGHT: string;
  COMMODITY_DESCRIPTION: string;
  HAZ_FLAG: string;
  REEF_FLAG: string;
  IS_REEFER: string;
  OVERSIZE_FLAG: string;
  IS_OOG: string;
  PACKAGE_CODE: string;
  COMMODITY_CODE_LARA: string;
  CONTRACT_TYPE: string;
  UNIF_RATE: string;
  COMMERCIAL_TRADE: string;
  COMMERCIAL_SUBTRADE: string;
  COMMERCIAL_POLE: string;
  COMMERCIAL_HAUL: string;
  COMMERCIAL_GROUP_LINE: string;
  VOYAGE_REF_JH: string;
  POINT_FROM: string;
  POINT_TO: string;
  SOC_FLAG: string;
  IS_EMPTY: string;
  MARKETING_COMMODITY_L0: string;
  MARKETING_COMMODITY_L1: string;
  MARKETING_COMMODITY_L2: string;
}

// Fonction pour convertir les valeurs booléennes
function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1';
}

// Fonction pour parser une date (format: YYYY-MM-DD)
function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

// Fonction pour parser un nombre
function parseNumeric(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

// Fonction pour parser une ligne CSV (gestion des guillemets)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double guillemet échappé
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // Push last field
  return result;
}

async function checkTables() {
  // Vérifier si les tables existent
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('job_reference')
    .limit(1);

  if (bookingsError && bookingsError.code === 'PGRST116') {
    console.log('⚠️  Les tables n\'existent pas encore.');
    console.log('📋 Veuillez d\'abord créer les tables en exécutant le SQL suivant dans Supabase:');
    console.log('\n' + `
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
  contract_type TEXT,
  unif_rate NUMERIC,
  commercial_trade TEXT,
  commercial_subtrade TEXT,
  commercial_pole TEXT,
  commercial_haul TEXT,
  commercial_group_line TEXT,
  voyage_ref_jh TEXT,
  point_from TEXT,
  point_to TEXT,
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
  soc_flag BOOLEAN DEFAULT FALSE,
  is_empty BOOLEAN DEFAULT FALSE,
  marketing_commodity_l0 TEXT,
  marketing_commodity_l1 TEXT,
  marketing_commodity_l2 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_reference, job_dtl_sequence),
  CONSTRAINT fk_dtl_sequences_booking 
    FOREIGN KEY (job_reference) 
    REFERENCES bookings(job_reference) 
    ON DELETE CASCADE
);
    `);
    process.exit(1);
  }
  console.log('✅ Tables vérifiées');
}

async function ingestCSV(filePath: string) {
  // Vérifier les tables d'abord
  await checkTables();
  
  console.log('📂 Lecture du fichier CSV...');
  
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
      // Lire les en-têtes
      headers = parseCSVLine(line);
      console.log(`✅ En-têtes détectés: ${headers.length} colonnes`);
      continue;
    }

    if (line.trim() === '') continue;

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      console.warn(`⚠️  Ligne ${lineNumber}: nombre de colonnes incorrect (${values.length} au lieu de ${headers.length})`);
      continue;
    }

    // Créer un objet à partir des en-têtes et valeurs
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const jobReference = row.JOB_REFERENCE_FAKE?.trim();
    if (!jobReference) {
      console.warn(`⚠️  Ligne ${lineNumber}: JOB_REFERENCE_FAKE manquant`);
      continue;
    }

    // Préparer les données pour bookings (niveau 1)
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
        contract_type: row.CONTRACT_TYPE?.trim() || null,
        unif_rate: parseNumeric(row.UNIF_RATE),
        commercial_trade: row.COMMERCIAL_TRADE?.trim() || null,
        commercial_subtrade: row.COMMERCIAL_SUBTRADE?.trim() || null,
        commercial_pole: row.COMMERCIAL_POLE?.trim() || null,
        commercial_haul: row.COMMERCIAL_HAUL?.trim() || null,
        commercial_group_line: row.COMMERCIAL_GROUP_LINE?.trim() || null,
        voyage_ref_jh: row.VOYAGE_REF_JH?.trim() || null,
        point_from: row.POINT_FROM?.trim() || null,
        point_to: row.POINT_TO?.trim() || null,
      });
    }

    // Préparer les données pour dtl_sequences (niveau 2)
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
        soc_flag: parseBoolean(row.SOC_FLAG),
        is_empty: parseBoolean(row.IS_EMPTY),
        marketing_commodity_l0: row.MARKETING_COMMODITY_L0?.trim() || null,
        marketing_commodity_l1: row.MARKETING_COMMODITY_L1?.trim() || null,
        marketing_commodity_l2: row.MARKETING_COMMODITY_L2?.trim() || null,
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
  
  // Insérer par batch de 1000
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

// Exécution
const csvPath = path.join(__dirname, '..', 'Albert School Sample 20k.csv');
ingestCSV(csvPath).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

