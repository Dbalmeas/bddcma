# Prompt Cursor MCP - Optimisation Configuration Supabase CMA CGM

## Contexte du Projet
Projet: **CMA CGM Talk to Data** - Outil conversationnel d'analyse de données shipping
Base de données: **Supabase PostgreSQL**
Données: ~20K bookings de shipping avec détails conteneurs (2018-2019)

## Objectif
Optimiser la configuration Supabase pour:
- Performance des requêtes complexes (agrégations multi-niveaux)
- Support des 6 questions métier CMA CGM
- Gestion efficace de la structure hiérarchique bookings → dtl_sequences
- Préparation pour montée en charge (100K+ bookings)

---

## Instructions pour Cursor via MCP Supabase

### 1. Analyser le Schéma Actuel

```
Utilise MCP Supabase pour analyser:
1. Structure des tables `bookings` et `dtl_sequences`
2. Index existants et leur utilisation
3. Clés étrangères et contraintes
4. Types de données et NULL constraints
5. Taille actuelle des tables

Commandes MCP:
- Lister toutes les colonnes des deux tables
- Afficher les index existants
- Vérifier les statistiques de performance
- Analyser les requêtes lentes (si logs disponibles)
```

### 2. Vérifier les Données

```
Exécute via MCP Supabase:

-- Statistiques de base
SELECT
  'bookings' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT shipcomp_code) as unique_clients,
  COUNT(DISTINCT point_load) as unique_pol,
  COUNT(DISTINCT point_disch) as unique_pod,
  MIN(booking_confirmation_date) as min_date,
  MAX(booking_confirmation_date) as max_date
FROM bookings;

SELECT
  'dtl_sequences' as table_name,
  COUNT(*) as row_count,
  SUM(nb_teu) as total_teu,
  SUM(nb_units) as total_units,
  AVG(nb_teu) as avg_teu_per_sequence
FROM dtl_sequences;

-- Vérifier les nouveaux champs (migration 20250110)
SELECT
  contract_type,
  COUNT(*) as count,
  SUM(CASE WHEN contract_type IS NULL THEN 1 ELSE 0 END) as null_count
FROM bookings
GROUP BY contract_type
ORDER BY count DESC
LIMIT 10;
```

### 3. Optimisations Index Requis

```
Vérifie et crée les index manquants pour les 6 questions métier:

-- Question 1: Volume TEU par client + période
CREATE INDEX IF NOT EXISTS idx_bookings_client_date
ON bookings(shipcomp_code, booking_confirmation_date);

-- Question 2: Spot vs Long Terme + trade
CREATE INDEX IF NOT EXISTS idx_bookings_contract_trade
ON bookings(contract_type, commercial_trade)
WHERE contract_type IS NOT NULL;

-- Question 3: Top clients par volume (agrégation)
CREATE INDEX IF NOT EXISTS idx_bookings_date_status
ON bookings(booking_confirmation_date, job_status);

-- Question 5: Reefers par port + date
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_flags
ON dtl_sequences(job_reference)
INCLUDE (is_reefer, haz_flag, is_oog);

-- Question 6: Marchandises dangereuses
CREATE INDEX IF NOT EXISTS idx_bookings_disch_country
ON bookings(point_disch_country, point_disch);

-- Optimisation jointure booking → dtl_sequences
CREATE INDEX IF NOT EXISTS idx_dtl_sequences_booking_composite
ON dtl_sequences(job_reference, nb_teu, nb_units);
```

### 4. Statistiques et Analyze

```
Mets à jour les statistiques PostgreSQL via MCP:

ANALYZE bookings;
ANALYZE dtl_sequences;

-- Vérifier la fragmentation
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE tablename IN ('bookings', 'dtl_sequences');
```

### 5. Row Level Security (RLS)

```
Configure les politiques RLS pour sécurité:

-- Désactiver RLS si non utilisé (pour éviter overhead)
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE dtl_sequences DISABLE ROW LEVEL SECURITY;

-- OU activer avec politique read-only
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON bookings
  FOR SELECT
  USING (true);

ALTER TABLE dtl_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON dtl_sequences
  FOR SELECT
  USING (true);
```

### 6. Matérialized Views pour Performance

```
Crée des vues matérialisées pour les agrégations fréquentes:

-- Vue: Volume TEU par client par mois
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_monthly_volumes AS
SELECT
  b.shipcomp_code,
  b.shipcomp_name,
  DATE_TRUNC('month', b.booking_confirmation_date) as month,
  COUNT(DISTINCT b.job_reference) as booking_count,
  SUM(d.nb_teu) as total_teu,
  SUM(d.nb_units) as total_units,
  SUM(d.net_weight) as total_weight
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9
GROUP BY b.shipcomp_code, b.shipcomp_name, DATE_TRUNC('month', b.booking_confirmation_date);

CREATE INDEX ON mv_client_monthly_volumes(shipcomp_code, month);
CREATE INDEX ON mv_client_monthly_volumes(month);

-- Vue: Volume par port (POL/POD)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_port_volumes AS
SELECT
  port_type,
  port_code,
  port_country,
  COUNT(*) as booking_count,
  SUM(total_teu) as total_teu,
  SUM(total_units) as total_units
FROM (
  SELECT 'POL' as port_type, point_load as port_code, point_load_country as port_country,
         b.job_reference, SUM(d.nb_teu) as total_teu, SUM(d.nb_units) as total_units
  FROM bookings b
  JOIN dtl_sequences d ON b.job_reference = d.job_reference
  WHERE b.job_status != 9
  GROUP BY point_load, point_load_country, b.job_reference

  UNION ALL

  SELECT 'POD' as port_type, point_disch as port_code, point_disch_country as port_country,
         b.job_reference, SUM(d.nb_teu) as total_teu, SUM(d.nb_units) as total_units
  FROM bookings b
  JOIN dtl_sequences d ON b.job_reference = d.job_reference
  WHERE b.job_status != 9
  GROUP BY point_disch, point_disch_country, b.job_reference
) as port_data
GROUP BY port_type, port_code, port_country;

CREATE INDEX ON mv_port_volumes(port_code);
CREATE INDEX ON mv_port_volumes(port_country);

-- Refresh automatique (à planifier)
-- REFRESH MATERIALIZED VIEW mv_client_monthly_volumes;
-- REFRESH MATERIALIZED VIEW mv_port_volumes;
```

### 7. Configuration PostgreSQL

```
Vérifie et suggère les paramètres PostgreSQL optimaux via MCP:

-- Vérifier la config actuelle
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW maintenance_work_mem;
SHOW max_parallel_workers_per_gather;

-- Suggérer optimisations (selon ressources Supabase)
-- Pour un dataset 20K-100K lignes:
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 16MB
-- maintenance_work_mem = 128MB
```

### 8. Fonctions Utilitaires

```
Crée des fonctions SQL pour les questions fréquentes:

-- Fonction: Calculer volume TEU client sur période
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
    SUM(d.nb_teu) as total_teu,
    COUNT(DISTINCT b.job_reference) as total_bookings,
    AVG(d.nb_teu) as avg_teu_per_booking
  FROM bookings b
  JOIN dtl_sequences d ON b.job_reference = d.job_reference
  WHERE b.shipcomp_code = p_client_code
    AND b.booking_confirmation_date >= p_start_date
    AND b.booking_confirmation_date <= p_end_date
    AND b.job_status != 9;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction: Top N clients par période
CREATE OR REPLACE FUNCTION get_top_clients(
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
  WITH client_volumes AS (
    SELECT
      b.shipcomp_code,
      b.shipcomp_name,
      SUM(d.nb_teu) as teu,
      COUNT(DISTINCT b.job_reference) as bookings
    FROM bookings b
    JOIN dtl_sequences d ON b.job_reference = d.job_reference
    WHERE b.job_status != 9
      AND (p_start_date IS NULL OR b.booking_confirmation_date >= p_start_date)
      AND (p_end_date IS NULL OR b.booking_confirmation_date <= p_end_date)
    GROUP BY b.shipcomp_code, b.shipcomp_name
  ),
  total_volume AS (
    SELECT SUM(teu) as total FROM client_volumes
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY cv.teu DESC)::INT as rank,
    cv.shipcomp_code,
    cv.shipcomp_name,
    cv.teu,
    cv.bookings,
    ROUND((cv.teu / tv.total * 100), 2) as percentage
  FROM client_volumes cv, total_volume tv
  ORDER BY cv.teu DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 9. Monitoring et Alertes

```
Configure le monitoring via MCP:

-- Vue: Requêtes lentes
CREATE OR REPLACE VIEW slow_queries AS
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 100 -- Plus de 100ms en moyenne
ORDER BY mean_time DESC
LIMIT 20;

-- Vue: Utilisation des index
CREATE OR REPLACE VIEW index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### 10. Tests de Performance

```
Teste les 6 questions métier via MCP avec EXPLAIN ANALYZE:

-- Test Question 1: Volume TEU client
EXPLAIN ANALYZE
SELECT
  b.shipcomp_name,
  SUM(d.nb_teu) as total_teu,
  COUNT(DISTINCT b.job_reference) as booking_count
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.shipcomp_code = '0001'
  AND b.booking_confirmation_date >= '2019-01-01'
  AND b.booking_confirmation_date < '2020-01-01'
  AND b.job_status != 9
GROUP BY b.shipcomp_name;

-- Test Question 3: Top 10 clients
EXPLAIN ANALYZE
SELECT * FROM get_top_clients(10, '2019-10-01', '2019-12-31');

-- Objectif: < 50ms pour questions simples, < 200ms pour agrégations complexes
```

---

## Checklist de Validation

Après optimisation, vérifie via MCP:

- [ ] Tous les index sont créés et utilisés
- [ ] ANALYZE exécuté sur toutes les tables
- [ ] Vues matérialisées créées et indexées
- [ ] Fonctions utilitaires testées
- [ ] Tests de performance < objectifs (50ms/200ms)
- [ ] RLS configuré selon besoins sécurité
- [ ] Monitoring configuré
- [ ] Pas de bloat/fragmentation excessive
- [ ] Statistiques à jour

---

## Résultat Attendu

Configuration Supabase optimale pour:
✅ Requêtes analytiques rapides (< 200ms)
✅ Support des 6 questions métier CMA CGM
✅ Scalabilité jusqu'à 100K+ bookings
✅ Monitoring et alertes en place
✅ Fonctions utilitaires réutilisables
✅ Index efficaces (< 5% de scans séquentiels)

---

## Commande Cursor

```bash
# Dans Cursor, utilise ce prompt avec:
# - MCP Server: Supabase connecté
# - Context: Ce fichier + migrations/ + scripts/
# - Action: Exécuter toutes les optimisations étape par étape

@supabase Execute the Supabase optimization plan above step by step.
Analyze current schema, create missing indexes, set up materialized views,
create utility functions, and validate performance for CMA CGM Talk to Data project.
```
