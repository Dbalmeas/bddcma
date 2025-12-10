-- Migration: Ajout des champs manquants pour supporter toutes les questions métier
-- Date: 2025-01-10
-- Objectif: Ajouter contract_type, unif_rate et champs commerciaux pour analyses complètes

-- Ajout de champs à la table bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS contract_type TEXT,
ADD COLUMN IF NOT EXISTS unif_rate NUMERIC,
ADD COLUMN IF NOT EXISTS commercial_trade TEXT,
ADD COLUMN IF NOT EXISTS commercial_subtrade TEXT,
ADD COLUMN IF NOT EXISTS commercial_pole TEXT,
ADD COLUMN IF NOT EXISTS commercial_haul TEXT,
ADD COLUMN IF NOT EXISTS commercial_group_line TEXT,
ADD COLUMN IF NOT EXISTS voyage_ref_jh TEXT,
ADD COLUMN IF NOT EXISTS point_from TEXT,
ADD COLUMN IF NOT EXISTS point_to TEXT;

-- Ajout de champs à la table dtl_sequences
ALTER TABLE dtl_sequences
ADD COLUMN IF NOT EXISTS soc_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_empty BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_commodity_l0 TEXT,
ADD COLUMN IF NOT EXISTS marketing_commodity_l1 TEXT,
ADD COLUMN IF NOT EXISTS marketing_commodity_l2 TEXT;

-- Index pour améliorer les performances des requêtes sur les nouveaux champs
CREATE INDEX IF NOT EXISTS idx_bookings_contract_type ON bookings(contract_type);
CREATE INDEX IF NOT EXISTS idx_bookings_commercial_trade ON bookings(commercial_trade);
CREATE INDEX IF NOT EXISTS idx_bookings_commercial_subtrade ON bookings(commercial_subtrade);
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_soc_flag ON dtl_sequences(soc_flag);
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_marketing_l0 ON dtl_sequences(marketing_commodity_l0);

-- Commentaires pour documentation
COMMENT ON COLUMN bookings.contract_type IS 'Type de contrat (ex: Quarterly, Monthly, Yearly, ou code régional)';
COMMENT ON COLUMN bookings.unif_rate IS 'Tarif unitaire du transport';
COMMENT ON COLUMN bookings.commercial_trade IS 'Route commerciale principale (ex: Asia-Europe)';
COMMENT ON COLUMN bookings.commercial_subtrade IS 'Sous-route commerciale plus précise';
COMMENT ON COLUMN dtl_sequences.soc_flag IS 'Shipper Owned Container - conteneur appartenant au client';
COMMENT ON COLUMN dtl_sequences.is_empty IS 'Conteneur vide en repositionnement';
