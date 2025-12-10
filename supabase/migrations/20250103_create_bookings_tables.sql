-- Migration: Création des tables bookings et dtl_sequences
-- Date: 2025-01-03
-- Projet: https://zrdmmvhjfvtqoecrsdjt.supabase.co

-- Table bookings: informations générales de réservation (niveau 1)
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

-- Table dtl_sequences: détails des conteneurs pour chaque booking (niveau 2, relation 1-N)
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

-- Commentaires pour documentation
COMMENT ON TABLE bookings IS 'Informations générales de réservation (niveau 1)';
COMMENT ON TABLE dtl_sequences IS 'Détails des conteneurs pour chaque booking (niveau 2, relation 1-N)';



