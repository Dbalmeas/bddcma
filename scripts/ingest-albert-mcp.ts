import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Fonction pour échapper les chaînes SQL
function escapeSQL(str: string | null | undefined): string {
  if (!str || str.trim() === '') return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
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

// Fonction pour convertir les valeurs booléennes
function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1';
}

// Fonction pour parser une date
function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

// Fonction pour parser un nombre
function parseNumeric(value: string): string {
  if (!value || value.trim() === '') return 'NULL';
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 'NULL' : parsed.toString();
}

async function generateSQLInserts(filePath: string) {
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

    // Préparer les données pour bookings
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
        job_status: parseNumeric(row.JOB_STATUS),
      });
    }

    // Préparer les données pour dtl_sequences
    const jobDtlSequence = parseNumeric(row.JOB_DTL_SEQUENCE);
    if (jobDtlSequence !== 'NULL') {
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

  // Générer les requêtes SQL pour les bookings
  console.log('\n📝 Génération des requêtes SQL...');
  const bookingsArray = Array.from(bookingsMap.values());
  
  // Générer INSERT pour bookings (par batch de 100)
  const bookingsSQL: string[] = [];
  for (let i = 0; i < bookingsArray.length; i += 100) {
    const batch = bookingsArray.slice(i, i + 100);
    const values = batch.map(b => {
      return `(${escapeSQL(b.job_reference)}, ${escapeSQL(b.shipcomp_code)}, ${escapeSQL(b.shipcomp_name)}, ${escapeSQL(b.point_load)}, ${escapeSQL(b.point_load_country)}, ${escapeSQL(b.point_disch)}, ${escapeSQL(b.point_disch_country)}, ${escapeSQL(b.origin)}, ${escapeSQL(b.destination)}, ${b.booking_confirmation_date ? escapeSQL(b.booking_confirmation_date) : 'NULL'}, ${b.cancellation_date ? escapeSQL(b.cancellation_date) : 'NULL'}, ${b.job_status === 'NULL' ? 'NULL' : b.job_status})`;
    }).join(',\n    ');
    
    bookingsSQL.push(`
INSERT INTO bookings (job_reference, shipcomp_code, shipcomp_name, point_load, point_load_country, point_disch, point_disch_country, origin, destination, booking_confirmation_date, cancellation_date, job_status)
VALUES ${values}
ON CONFLICT (job_reference) DO UPDATE SET
  shipcomp_code = EXCLUDED.shipcomp_code,
  shipcomp_name = EXCLUDED.shipcomp_name,
  point_load = EXCLUDED.point_load,
  point_load_country = EXCLUDED.point_load_country,
  point_disch = EXCLUDED.point_disch,
  point_disch_country = EXCLUDED.point_disch_country,
  origin = EXCLUDED.origin,
  destination = EXCLUDED.destination,
  booking_confirmation_date = EXCLUDED.booking_confirmation_date,
  cancellation_date = EXCLUDED.cancellation_date,
  job_status = EXCLUDED.job_status,
  updated_at = NOW();`);
  }

  // Générer INSERT pour dtl_sequences (par batch de 100)
  const dtlSequencesSQL: string[] = [];
  for (let i = 0; i < dtlSequences.length; i += 100) {
    const batch = dtlSequences.slice(i, i + 100);
    const values = batch.map(d => {
      return `(${escapeSQL(d.job_reference)}, ${d.job_dtl_sequence}, ${d.nb_teu === 'NULL' ? 'NULL' : d.nb_teu}, ${d.nb_units === 'NULL' ? 'NULL' : d.nb_units}, ${escapeSQL(d.commodity_description)}, ${d.net_weight === 'NULL' ? 'NULL' : d.net_weight}, ${d.haz_flag}, ${d.reef_flag}, ${d.is_reefer}, ${d.oversize_flag}, ${d.is_oog}, ${escapeSQL(d.package_code)}, ${escapeSQL(d.commodity_code_lara)})`;
    }).join(',\n    ');
    
    dtlSequencesSQL.push(`
INSERT INTO dtl_sequences (job_reference, job_dtl_sequence, nb_teu, nb_units, commodity_description, net_weight, haz_flag, reef_flag, is_reefer, oversize_flag, is_oog, package_code, commodity_code_lara)
VALUES ${values}
ON CONFLICT (job_reference, job_dtl_sequence) DO UPDATE SET
  nb_teu = EXCLUDED.nb_teu,
  nb_units = EXCLUDED.nb_units,
  commodity_description = EXCLUDED.commodity_description,
  net_weight = EXCLUDED.net_weight,
  haz_flag = EXCLUDED.haz_flag,
  reef_flag = EXCLUDED.reef_flag,
  is_reefer = EXCLUDED.is_reefer,
  oversize_flag = EXCLUDED.oversize_flag,
  is_oog = EXCLUDED.is_oog,
  package_code = EXCLUDED.package_code,
  commodity_code_lara = EXCLUDED.commodity_code_lara,
  updated_at = NOW();`);
  }

  // Écrire les requêtes SQL dans un fichier
  const sqlFile = path.join(__dirname, '..', 'albert-school-inserts.sql');
  const allSQL = [
    '-- Insertions pour les bookings',
    ...bookingsSQL,
    '',
    '-- Insertions pour les dtl_sequences',
    ...dtlSequencesSQL
  ].join('\n');

  fs.writeFileSync(sqlFile, allSQL);
  console.log(`\n✅ Fichier SQL généré: ${sqlFile}`);
  console.log(`   - ${bookingsSQL.length} requêtes pour bookings`);
  console.log(`   - ${dtlSequencesSQL.length} requêtes pour dtl_sequences`);
  console.log(`\n💡 Vous pouvez maintenant exécuter ce fichier SQL dans Supabase ou utiliser les outils MCP.`);
}

// Exécution
const csvPath = path.join(__dirname, '..', 'Albert School Sample 20k.csv');
generateSQLInserts(csvPath).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

