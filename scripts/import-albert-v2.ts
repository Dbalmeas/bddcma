#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BookingRecord {
  job_reference: string;
  shipcomp_code: string;
  shipcomp_name: string;
  commercial_haul: string;
  commercial_pole: string;
  commercial_subtrade: string;
  commercial_trade: string;
  commercial_group_line: string;
  origin: string;
  destination: string;
  point_load: string;
  point_load_desc: string;
  point_load_country: string;
  point_load_country_desc: string;
  point_disch: string;
  point_disch_desc: string;
  point_disch_country: string;
  point_disch_country_desc: string;
  export_mvt_terms_desc: string;
  import_mvt_terms_desc: string;
  job_status: number;
  booking_confirmation_date: string | null;
  cancellation_date: string | null;
  partner_code: string;
  partner_name: string;
  uo_name: string;
  voyage_reference: string;
  service_no: string;
  inland_load_country: string;
  inland_disch_country: string;
  booking_agent_office: string;
  booking_agent_country: string;
  booking_agent_ro: string;
  contract_type: string;
}

interface DetailRecord {
  job_reference: string;
  job_dtl_sequence: number;
  package_code: string;
  haz_flag: boolean;
  reef_flag: boolean;
  oog_flag: boolean;
  soc_flag: boolean;
  is_empty: boolean;
  nb_units: number;
  teus_booked: number;
  net_weight_booked: number;
  unif_rate: number;
  commodity_code_lara: string;
  marketing_commodity_l0: string;
  marketing_commodity_l1: string;
  marketing_commodity_l2: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '') return null;
  // Format: 2020-04-15
  return dateStr;
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

async function importData() {
  const csvPath = path.join(process.cwd(), 'Albert_School_V2_6months2020.csv');
  
  console.log('📂 Lecture du fichier:', csvPath);
  
  // PHASE 1: Collecter toutes les données
  console.log('🔍 Phase 1: Lecture et parsing du CSV...\n');
  
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let lineNumber = 0;
  let headers: string[] = [];
  
  const allBookings: BookingRecord[] = [];
  const allDetails: DetailRecord[] = [];
  
  const seenBookings = new Set<string>();
  
  for await (const line of rl) {
    lineNumber++;
    
    if (lineNumber === 1) {
      headers = parseCSVLine(line);
      console.log(`✓ Headers trouvés: ${headers.length} colonnes`);
      continue;
    }
    
    if (line.trim() === '') continue;
    
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      console.warn(`⚠️  Ligne ${lineNumber}: nombre de colonnes incorrect (${values.length} vs ${headers.length})`);
      continue;
    }
    
    // Créer un objet avec les valeurs
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    // Créer l'enregistrement booking (seulement si nouveau)
    if (!seenBookings.has(row.JOB_REFERENCE)) {
      const booking: BookingRecord = {
        job_reference: row.JOB_REFERENCE,
        shipcomp_code: row.SHIPCOMP_CODE,
        shipcomp_name: row.SHIPCOMP_NAME,
        commercial_haul: row.COMMERCIAL_HAUL,
        commercial_pole: row.COMMERCIAL_POLE,
        commercial_subtrade: row.COMMERCIAL_SUBTRADE,
        commercial_trade: row.COMMERCIAL_TRADE,
        commercial_group_line: row.COMMERCIAL_GROUP_LINE,
        origin: row.ORIGIN,
        destination: row.DESTINATION,
        point_load: row.POINT_LOAD,
        point_load_desc: row.POINT_LOAD_DESC,
        point_load_country: row.POINT_LOAD_COUNTRY,
        point_load_country_desc: row.POINT_LOAD_COUNTRY_DESC,
        point_disch: row.POINT_DISCH,
        point_disch_desc: row.POINT_DISCH_DESC,
        point_disch_country: row.POINT_DISCH_COUNTRY,
        point_disch_country_desc: row.POINT_DISCH_COUNTRY_DESC,
        export_mvt_terms_desc: row.EXPORT_MVT_TERMS_DESC,
        import_mvt_terms_desc: row.IMPORT_MVT_TERMS_DESC,
        job_status: parseInt(row.JOB_STATUS),
        booking_confirmation_date: parseDate(row.BOOKING_CONFIRMATION_DATE),
        cancellation_date: parseDate(row.CANCELLATION_DATE),
        partner_code: row.PARTNER_CODE,
        partner_name: row.PARTNER_NAME,
        uo_name: row.UO_NAME,
        voyage_reference: row.VOYAGE_REFERENCE,
        service_no: row.SERVICE_NO,
        inland_load_country: row.INLAND_LOAD_COUNTRY,
        inland_disch_country: row.INLAND_DISCH_COUNTRY,
        booking_agent_office: row.BOOKING_AGENT_OFFICE,
        booking_agent_country: row.BOOKING_AGENT_COUNTRY,
        booking_agent_ro: row.BOOKING_AGENT_RO,
        contract_type: row.CONTRACT_TYPE,
      };
      
      allBookings.push(booking);
      seenBookings.add(row.JOB_REFERENCE);
    }
    
    // Créer l'enregistrement detail
    const detail: DetailRecord = {
      job_reference: row.JOB_REFERENCE,
      job_dtl_sequence: parseInt(row.JOB_DTL_SEQUENCE),
      package_code: row.PACKAGE_CODE,
      haz_flag: parseBoolean(row.HAZ_FLAG),
      reef_flag: parseBoolean(row.REEF_FLAG),
      oog_flag: parseBoolean(row.OOG_FLAG),
      soc_flag: parseBoolean(row.SOC_FLAG),
      is_empty: row.IS_EMPTY === 'Full' ? false : true,
      nb_units: parseNumber(row.NB_UNITS),
      teus_booked: parseNumber(row.TEUS_BOOKED),
      net_weight_booked: parseNumber(row.NET_WEIGHT_BOOKED),
      unif_rate: parseNumber(row.UNIF_RATE),
      commodity_code_lara: row.COMMODITY_CODE_LARA,
      marketing_commodity_l0: row.MARKETING_COMMODITY_L0,
      marketing_commodity_l1: row.MARKETING_COMMODITY_L1,
      marketing_commodity_l2: row.MARKETING_COMMODITY_L2,
    };
    
    allDetails.push(detail);
    
    if (lineNumber % 50000 === 0) {
      console.log(`📊 Progression lecture: ${lineNumber.toLocaleString()} lignes lues`);
    }
  }
  
  console.log(`\n✓ Lecture terminée: ${lineNumber.toLocaleString()} lignes`);
  console.log(`✓ ${allBookings.length.toLocaleString()} bookings uniques`);
  console.log(`✓ ${allDetails.length.toLocaleString()} détails\n`);
  
  // PHASE 2: Insérer TOUS les bookings d'abord
  console.log('📥 Phase 2: Insertion des bookings...\n');
  
  const BATCH_SIZE = 500;
  let totalBookings = 0;
  
  for (let i = 0; i < allBookings.length; i += BATCH_SIZE) {
    const batch = allBookings.slice(i, i + BATCH_SIZE);
    
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert(batch);
    
    if (bookingError) {
      console.error('❌ Erreur insertion bookings:', bookingError);
      throw bookingError;
    }
    
    totalBookings += batch.length;
    
    if (totalBookings % 5000 === 0) {
      console.log(`✓ ${totalBookings.toLocaleString()} / ${allBookings.length.toLocaleString()} bookings insérés...`);
    }
  }
  
  console.log(`\n✅ Tous les bookings insérés: ${totalBookings.toLocaleString()}\n`);
  
  // PHASE 3: Insérer TOUS les détails ensuite
  console.log('📥 Phase 3: Insertion des détails...\n');
  
  let totalDetails = 0;
  
  for (let i = 0; i < allDetails.length; i += BATCH_SIZE) {
    const batch = allDetails.slice(i, i + BATCH_SIZE);
    
    const { error: detailError } = await supabase
      .from('dtl_sequences')
      .insert(batch);
    
    if (detailError) {
      console.error('❌ Erreur insertion details:', detailError);
      throw detailError;
    }
    
    totalDetails += batch.length;
    
    if (totalDetails % 5000 === 0) {
      console.log(`✓ ${totalDetails.toLocaleString()} / ${allDetails.length.toLocaleString()} détails insérés...`);
    }
  }
  
  console.log('\n✅ Import terminé avec succès!');
  console.log(`📊 Total bookings: ${totalBookings.toLocaleString()}`);
  console.log(`📊 Total détails: ${totalDetails.toLocaleString()}`);
  console.log(`📊 Lignes CSV traitées: ${lineNumber.toLocaleString()}`);
}

// Exécution
importData()
  .then(() => {
    console.log('\n✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });
