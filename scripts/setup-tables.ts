import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function setupTables() {
  console.log('🔧 Configuration des tables dans Supabase...');
  console.log(`   Projet: ${supabaseUrl}`);

  const createTablesSQL = `
-- Table bookings: informations générales de réservation
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

-- Table dtl_sequences: détails des conteneurs pour chaque booking
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

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_bookings_shipcomp ON bookings(shipcomp_code);
CREATE INDEX IF NOT EXISTS idx_bookings_point_load ON bookings(point_load);
CREATE INDEX IF NOT EXISTS idx_bookings_point_disch ON bookings(point_disch);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(job_status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_confirmation_date);
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_job_ref ON dtl_sequences(job_reference);
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_commodity ON dtl_sequences(commodity_description);
`;

  // Exécuter via RPC ou SQL direct
  const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
  
  if (error) {
    // Si RPC n'existe pas, on affiche le SQL à exécuter manuellement
    console.log('⚠️  Impossible d\'exécuter le SQL automatiquement.');
    console.log('📋 Veuillez exécuter ce SQL dans l\'éditeur SQL de Supabase:');
    console.log('\n' + createTablesSQL);
    return;
  }

  console.log('✅ Tables créées avec succès!');
}

setupTables().catch(console.error);

