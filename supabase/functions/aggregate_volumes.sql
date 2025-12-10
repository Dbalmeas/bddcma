-- Fonction SQL pour agréger les volumes TEU de manière performante
-- Évite les timeouts en faisant l'agrégation côté DB au lieu de JavaScript

CREATE OR REPLACE FUNCTION aggregate_volumes(
  p_group_by TEXT DEFAULT 'client', -- 'client', 'pol', 'pod', 'month', 'port_country'
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_filter TEXT DEFAULT NULL,
  p_pol_filter TEXT DEFAULT NULL,
  p_pod_filter TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  group_key TEXT,
  group_name TEXT,
  booking_count BIGINT,
  total_teu NUMERIC,
  total_units NUMERIC,
  total_weight NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT
      %s AS group_key,
      %s AS group_name,
      COUNT(DISTINCT b.job_reference)::BIGINT AS booking_count,
      SUM(d.teus_booked)::NUMERIC AS total_teu,
      SUM(d.nb_units)::NUMERIC AS total_units,
      SUM(d.net_weight_booked)::NUMERIC AS total_weight
    FROM bookings b
    JOIN dtl_sequences d ON b.job_reference = d.job_reference
    WHERE b.job_status != 9
      AND ($1::DATE IS NULL OR b.booking_confirmation_date >= $1)
      AND ($2::DATE IS NULL OR b.booking_confirmation_date <= $2)
      AND ($3::TEXT IS NULL OR b.partner_code ILIKE ''%%'' || $3 || ''%%'' OR b.partner_name ILIKE ''%%'' || $3 || ''%%'')
      AND ($4::TEXT IS NULL OR b.point_load ILIKE ''%%'' || $4 || ''%%'')
      AND ($5::TEXT IS NULL OR b.point_disch ILIKE ''%%'' || $5 || ''%%'')
    GROUP BY group_key, group_name
    ORDER BY total_teu DESC NULLS LAST
    LIMIT $6
  ',
  CASE p_group_by
    WHEN 'client' THEN 'COALESCE(b.partner_code, '''')'
    WHEN 'pol' THEN 'COALESCE(b.point_load, '''')'
    WHEN 'pod' THEN 'COALESCE(b.point_disch, '''')'
    WHEN 'month' THEN 'TO_CHAR(b.booking_confirmation_date, ''YYYY-MM'')'
    WHEN 'pol_country' THEN 'COALESCE(b.point_load_country, '''')'
    WHEN 'pod_country' THEN 'COALESCE(b.point_disch_country, '''')'
    ELSE 'COALESCE(b.partner_code, '''')'
  END,
  CASE p_group_by
    WHEN 'client' THEN 'COALESCE(b.partner_name, b.partner_code, ''Unknown'')'
    WHEN 'pol' THEN 'COALESCE(b.point_load_desc, b.point_load, ''Unknown'')'
    WHEN 'pod' THEN 'COALESCE(b.point_disch_desc, b.point_disch, ''Unknown'')'
    WHEN 'month' THEN 'TO_CHAR(b.booking_confirmation_date, ''YYYY-MM'')'
    WHEN 'pol_country' THEN 'COALESCE(b.point_load_country_desc, b.point_load_country, ''Unknown'')'
    WHEN 'pod_country' THEN 'COALESCE(b.point_disch_country_desc, b.point_disch_country, ''Unknown'')'
    ELSE 'COALESCE(b.partner_name, ''Unknown'')'
  END
  )
  USING p_start_date, p_end_date, p_client_filter, p_pol_filter, p_pod_filter, p_limit;
END;
$$ LANGUAGE plpgsql;
