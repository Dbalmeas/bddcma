-- Migration: Corriger la confusion entre clients (partners) et transporteurs (shipcomp)
-- Date: 2025-01-09
-- Description: Les vues et fonctions utilisaient shipcomp_code au lieu de partner_code

-- ============================================================================
-- PARTIE 1: Recréer la vue matérialisée avec les VRAIS clients (partners)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_client_monthly_volumes CASCADE;

CREATE MATERIALIZED VIEW mv_client_monthly_volumes AS
SELECT
  b.partner_code,
  b.partner_name,
  DATE_TRUNC('month', b.booking_confirmation_date)::date as month,
  COUNT(DISTINCT b.job_reference) as booking_count,
  COALESCE(SUM(d.teus_booked), 0) as total_teu,
  COALESCE(SUM(d.nb_units), 0) as total_units,
  COALESCE(SUM(d.net_weight_booked), 0) as total_weight
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9 AND b.booking_confirmation_date IS NOT NULL
GROUP BY b.partner_code, b.partner_name, DATE_TRUNC('month', b.booking_confirmation_date);

-- Index pour performance
CREATE INDEX idx_mv_client_monthly_partner_month ON mv_client_monthly_volumes(partner_code, month);
CREATE INDEX idx_mv_client_monthly_month ON mv_client_monthly_volumes(month);

-- ============================================================================
-- PARTIE 2: Créer une nouvelle vue pour les TRANSPORTEURS (shipcomp)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_shipper_monthly_volumes CASCADE;

CREATE MATERIALIZED VIEW mv_shipper_monthly_volumes AS
SELECT
  b.shipcomp_code,
  b.shipcomp_name,
  DATE_TRUNC('month', b.booking_confirmation_date)::date as month,
  COUNT(DISTINCT b.job_reference) as booking_count,
  COALESCE(SUM(d.teus_booked), 0) as total_teu,
  COALESCE(SUM(d.nb_units), 0) as total_units,
  COALESCE(SUM(d.net_weight_booked), 0) as total_weight
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9 AND b.booking_confirmation_date IS NOT NULL
GROUP BY b.shipcomp_code, b.shipcomp_name, DATE_TRUNC('month', b.booking_confirmation_date);

-- Index pour performance
CREATE INDEX idx_mv_shipper_monthly_shipper_month ON mv_shipper_monthly_volumes(shipcomp_code, month);
CREATE INDEX idx_mv_shipper_monthly_month ON mv_shipper_monthly_volumes(month);

-- ============================================================================
-- PARTIE 3: Corriger les fonctions pour utiliser partner_code (clients)
-- ============================================================================

-- Fonction: Volume TEU CLIENT (partner) sur période
CREATE OR REPLACE FUNCTION get_client_volume(
  p_client_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_teu NUMERIC,
  total_bookings BIGINT,
  avg_teu_per_booking NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(d.teus_booked) as total_teu,
    COUNT(DISTINCT b.job_reference) as total_bookings,
    AVG(d.teus_booked) as avg_teu_per_booking
  FROM bookings b
  JOIN dtl_sequences d ON b.job_reference = d.job_reference
  WHERE b.partner_code = p_client_code
    AND b.booking_confirmation_date >= p_start_date
    AND b.booking_confirmation_date <= p_end_date
    AND b.job_status != 9;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction: Top N CLIENTS (partners) par période
CREATE OR REPLACE FUNCTION get_top_clients(
  p_limit INT DEFAULT 10,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  rank INT,
  partner_code TEXT,
  partner_name TEXT,
  total_teu NUMERIC,
  total_bookings BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH client_volumes AS (
    SELECT
      b.partner_code,
      b.partner_name,
      SUM(d.teus_booked) as teu,
      COUNT(DISTINCT b.job_reference) as bookings
    FROM bookings b
    JOIN dtl_sequences d ON b.job_reference = d.job_reference
    WHERE b.job_status != 9
      AND (p_start_date IS NULL OR b.booking_confirmation_date >= p_start_date)
      AND (p_end_date IS NULL OR b.booking_confirmation_date <= p_end_date)
    GROUP BY b.partner_code, b.partner_name
  ),
  total_volume AS (
    SELECT SUM(teu) as total FROM client_volumes
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY cv.teu DESC)::INT as rank,
    cv.partner_code,
    cv.partner_name,
    cv.teu,
    cv.bookings,
    ROUND((cv.teu / tv.total * 100), 2) as percentage
  FROM client_volumes cv, total_volume tv
  ORDER BY cv.teu DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PARTIE 4: Nouvelles fonctions pour les TRANSPORTEURS (shippers)
-- ============================================================================

-- Fonction: Volume TEU TRANSPORTEUR (shipper) sur période
CREATE OR REPLACE FUNCTION get_shipper_volume(
  p_shipper_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_teu NUMERIC,
  total_bookings BIGINT,
  avg_teu_per_booking NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(d.teus_booked) as total_teu,
    COUNT(DISTINCT b.job_reference) as total_bookings,
    AVG(d.teus_booked) as avg_teu_per_booking
  FROM bookings b
  JOIN dtl_sequences d ON b.job_reference = d.job_reference
  WHERE b.shipcomp_code = p_shipper_code
    AND b.booking_confirmation_date >= p_start_date
    AND b.booking_confirmation_date <= p_end_date
    AND b.job_status != 9;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction: Top N TRANSPORTEURS (shippers) par période
CREATE OR REPLACE FUNCTION get_top_shippers(
  p_limit INT DEFAULT 10,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  rank INT,
  shipcomp_code TEXT,
  shipcomp_name TEXT,
  total_teu NUMERIC,
  total_bookings BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH shipper_volumes AS (
    SELECT
      b.shipcomp_code,
      b.shipcomp_name,
      SUM(d.teus_booked) as teu,
      COUNT(DISTINCT b.job_reference) as bookings
    FROM bookings b
    JOIN dtl_sequences d ON b.job_reference = d.job_reference
    WHERE b.job_status != 9
      AND (p_start_date IS NULL OR b.booking_confirmation_date >= p_start_date)
      AND (p_end_date IS NULL OR b.booking_confirmation_date <= p_end_date)
    GROUP BY b.shipcomp_code, b.shipcomp_name
  ),
  total_volume AS (
    SELECT SUM(teu) as total FROM shipper_volumes
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY sv.teu DESC)::INT as rank,
    sv.shipcomp_code,
    sv.shipcomp_name,
    sv.teu,
    sv.bookings,
    ROUND((sv.teu / tv.total * 100), 2) as percentage
  FROM shipper_volumes sv, total_volume tv
  ORDER BY sv.teu DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PARTIE 5: Index supplémentaires pour optimiser les requêtes clients
-- ============================================================================

-- Index sur partner_code pour requêtes clients
CREATE INDEX IF NOT EXISTS idx_bookings_partner_date 
ON bookings(partner_code, booking_confirmation_date);

CREATE INDEX IF NOT EXISTS idx_bookings_partner_status 
ON bookings(partner_code, job_status);

-- ============================================================================
-- PARTIE 6: Commentaires pour documentation
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_client_monthly_volumes IS 
'Vue matérialisée des volumes mensuels par CLIENT (partner_code). 
Exemple: Décathlon, Agacia Ceylon, etc.';

COMMENT ON MATERIALIZED VIEW mv_shipper_monthly_volumes IS 
'Vue matérialisée des volumes mensuels par TRANSPORTEUR (shipcomp_code). 
Exemple: CMA CGM, APL, ANL, etc.';

COMMENT ON FUNCTION get_client_volume IS 
'Calcule le volume TEU pour un CLIENT spécifique (partner_code) sur une période.
Exemple: get_client_volume(''0002599371'', ''2020-01-01'', ''2020-12-31'') pour Décathlon Kenya';

COMMENT ON FUNCTION get_shipper_volume IS 
'Calcule le volume TEU pour un TRANSPORTEUR spécifique (shipcomp_code) sur une période.
Exemple: get_shipper_volume(''0001'', ''2020-01-01'', ''2020-12-31'') pour CMA CGM';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
