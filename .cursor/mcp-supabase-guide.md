# 🚀 Guide Cursor MCP + Supabase - CMA CGM Talk to Data

## 📋 Configuration MCP Supabase

### 1. Vérifier la Configuration MCP

Votre fichier `~/.cursor/mcp.json` devrait contenir :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase",
        "postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
      ]
    }
  }
}
```

**Pour CMA CGM projet, remplacer par :**

```json
{
  "mcpServers": {
    "supabase-cma-cgm": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase",
        "postgresql://postgres.zrdmmvhjfvtqoecrsdjt:[YOUR_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
      ],
      "env": {
        "SUPABASE_URL": "https://zrdmmvhjfvtqoecrsdjt.supabase.co",
        "SUPABASE_ANON_KEY": "[YOUR_ANON_KEY]",
        "SUPABASE_SERVICE_ROLE_KEY": "[YOUR_SERVICE_KEY]"
      }
    }
  }
}
```

### 2. Obtenir les Credentials Supabase

1. Aller sur [https://supabase.com/dashboard/project/zrdmmvhjfvtqoecrsdjt](https://supabase.com/dashboard/project/zrdmmvhjfvtqoecrsdjt)
2. Settings → Database → Connection String
3. Copier le mot de passe PostgreSQL
4. Settings → API → Project API Keys → Copier anon et service_role keys

---

## 🎯 Utilisation dans Cursor

### Commandes Disponibles via MCP

Une fois MCP Supabase configuré, dans Cursor Chat vous pouvez :

#### 1. **Analyser le Schéma**

```
@supabase Show me the complete schema of the bookings and dtl_sequences tables
```

#### 2. **Exécuter des Requêtes**

```
@supabase Execute:
SELECT COUNT(*) as total_bookings,
       COUNT(DISTINCT shipcomp_code) as unique_clients,
       SUM(CASE WHEN contract_type IS NOT NULL THEN 1 ELSE 0 END) as with_contract_type
FROM bookings
```

#### 3. **Vérifier les Index**

```
@supabase List all indexes on bookings and dtl_sequences tables with their usage statistics
```

#### 4. **Créer des Index**

```
@supabase Create the following index if it doesn't exist:
CREATE INDEX CONCURRENTLY idx_bookings_client_date
ON bookings(shipcomp_code, booking_confirmation_date)
```

#### 5. **Analyser les Performances**

```
@supabase Run EXPLAIN ANALYZE on this query:
SELECT b.shipcomp_name, SUM(d.nb_teu) as total_teu
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.booking_confirmation_date >= '2019-01-01'
GROUP BY b.shipcomp_name
ORDER BY total_teu DESC
LIMIT 10
```

---

## 🔧 Optimisations Automatiques

### Prompt Complet pour Cursor

Copier-coller ce prompt dans Cursor Chat :

```
@supabase I need to optimize the CMA CGM Talk to Data Supabase database.

Context:
- Tables: bookings (20K rows) and dtl_sequences (60K rows)
- Hierarchical structure: 1 booking → N dtl_sequences
- 6 main business queries to support (client volumes, spot vs long term, top clients, YoY comparison, reefers, hazardous goods)

Please execute the following optimization plan:

1. ANALYZE CURRENT STATE
   - Show current table sizes and row counts
   - List all existing indexes with usage stats
   - Check for missing foreign key constraints
   - Verify new fields from migration 20250110 are populated

2. CREATE MISSING INDEXES
   Execute these index creations:
   - idx_bookings_client_date (shipcomp_code, booking_confirmation_date)
   - idx_bookings_contract_trade (contract_type, commercial_trade) WHERE contract_type IS NOT NULL
   - idx_bookings_date_status (booking_confirmation_date, job_status)
   - idx_dtl_sequences_flags (job_reference) INCLUDE (is_reefer, haz_flag, is_oog)
   - idx_bookings_disch_country (point_disch_country, point_disch)
   - idx_dtl_sequences_booking_composite (job_reference, nb_teu, nb_units)

3. UPDATE STATISTICS
   Run ANALYZE on both tables

4. CREATE UTILITY FUNCTIONS
   - get_client_volume(client_code, start_date, end_date)
   - get_top_clients(limit, start_date, end_date)

5. TEST PERFORMANCE
   Run EXPLAIN ANALYZE on the 6 business queries and report execution times

6. PROVIDE RECOMMENDATIONS
   Suggest any additional optimizations based on the analysis

Execute each step sequentially and report results.
```

---

## 📊 Requêtes de Monitoring

### Dashboard SQL à Exécuter Régulièrement

```sql
-- 1. Santé Générale
SELECT
  'bookings' as table,
  COUNT(*) as rows,
  pg_size_pretty(pg_total_relation_size('bookings')) as total_size,
  pg_size_pretty(pg_indexes_size('bookings')) as indexes_size
FROM bookings
UNION ALL
SELECT
  'dtl_sequences' as table,
  COUNT(*) as rows,
  pg_size_pretty(pg_total_relation_size('dtl_sequences')) as total_size,
  pg_size_pretty(pg_indexes_size('dtl_sequences')) as indexes_size
FROM dtl_sequences;

-- 2. Index Usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. Requêtes Lentes (si pg_stat_statements activé)
SELECT
  LEFT(query, 100) as query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_ms,
  ROUND(max_exec_time::numeric, 2) as max_ms,
  ROUND((total_exec_time / 1000 / 60)::numeric, 2) as total_minutes
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 4. Cache Hit Ratio (objectif > 99%)
SELECT
  schemaname,
  tablename,
  heap_blks_read as disk_reads,
  heap_blks_hit as cache_hits,
  ROUND(
    100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0),
    2
  ) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY heap_blks_read DESC;
```

---

## 🎨 Requêtes des 6 Questions Métier

### Templates SQL pour Cursor + MCP

#### Question 1: Volume TEU Client
```sql
@supabase Execute and explain performance:

SELECT
  b.shipcomp_code,
  b.shipcomp_name,
  DATE_TRUNC('month', b.booking_confirmation_date) as month,
  COUNT(DISTINCT b.job_reference) as booking_count,
  SUM(d.nb_teu) as total_teu,
  ROUND(AVG(d.nb_teu), 2) as avg_teu_per_booking
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.shipcomp_code = '0001'
  AND b.booking_confirmation_date >= '2019-01-01'
  AND b.booking_confirmation_date < '2020-01-01'
  AND b.job_status != 9
GROUP BY b.shipcomp_code, b.shipcomp_name, DATE_TRUNC('month', b.booking_confirmation_date)
ORDER BY month;
```

#### Question 2: Spot vs Long Terme
```sql
@supabase Execute and classify contract types:

WITH contract_classification AS (
  SELECT
    CASE
      WHEN contract_type IN ('Quarterly', 'Monthly', 'Yearly') THEN 'Long Terme'
      WHEN contract_type IN ('Unknown', '') OR contract_type IS NULL THEN 'Unknown'
      ELSE 'Spot'
    END as contract_class,
    b.job_reference
  FROM bookings b
  WHERE b.commercial_trade = 'Asia-Europe'
    AND b.job_status != 9
)
SELECT
  cc.contract_class,
  COUNT(DISTINCT cc.job_reference) as booking_count,
  SUM(d.nb_teu) as total_teu,
  ROUND(100.0 * COUNT(DISTINCT cc.job_reference) /
    SUM(COUNT(DISTINCT cc.job_reference)) OVER (), 2) as percentage
FROM contract_classification cc
JOIN dtl_sequences d ON cc.job_reference = d.job_reference
GROUP BY cc.contract_class
ORDER BY total_teu DESC;
```

#### Question 3: Top 10 Clients
```sql
@supabase Execute with timing:

SELECT
  ROW_NUMBER() OVER (ORDER BY SUM(d.nb_teu) DESC) as rank,
  b.shipcomp_code,
  b.shipcomp_name,
  COUNT(DISTINCT b.job_reference) as booking_count,
  SUM(d.nb_teu) as total_teu,
  SUM(d.nb_units) as total_units,
  ROUND(100.0 * SUM(d.nb_teu) / SUM(SUM(d.nb_teu)) OVER (), 2) as percentage
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.booking_confirmation_date >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '3 months')
  AND b.booking_confirmation_date < DATE_TRUNC('quarter', CURRENT_DATE)
  AND b.job_status != 9
GROUP BY b.shipcomp_code, b.shipcomp_name
ORDER BY total_teu DESC
LIMIT 10;
```

#### Question 4: Baisse Volume YoY
```sql
@supabase Execute Year-over-Year comparison:

WITH volumes_by_year AS (
  SELECT
    b.shipcomp_code,
    b.shipcomp_name,
    EXTRACT(YEAR FROM b.booking_confirmation_date) as year,
    SUM(d.nb_teu) as total_teu
  FROM bookings b
  JOIN dtl_sequences d ON b.job_reference = d.job_reference
  WHERE b.job_status != 9
    AND b.booking_confirmation_date >= '2018-01-01'
  GROUP BY b.shipcomp_code, b.shipcomp_name, EXTRACT(YEAR FROM b.booking_confirmation_date)
),
yoy_comparison AS (
  SELECT
    v1.shipcomp_code,
    v1.shipcomp_name,
    v1.total_teu as current_year_teu,
    v2.total_teu as previous_year_teu,
    ROUND(100.0 * (v1.total_teu - v2.total_teu) / NULLIF(v2.total_teu, 0), 2) as yoy_change_pct
  FROM volumes_by_year v1
  LEFT JOIN volumes_by_year v2
    ON v1.shipcomp_code = v2.shipcomp_code
    AND v1.year = v2.year + 1
  WHERE v1.year = 2019
)
SELECT *
FROM yoy_comparison
WHERE yoy_change_pct < -20
ORDER BY yoy_change_pct ASC;
```

#### Question 5: Reefers Shanghai Novembre
```sql
@supabase Count reefer containers from Shanghai:

SELECT
  b.point_load,
  b.point_load_country,
  COUNT(DISTINCT b.job_reference) as booking_count,
  SUM(d.nb_units) as total_reefer_units,
  SUM(d.nb_teu) as total_reefer_teu
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.point_load LIKE '%Shanghai%'
  AND EXTRACT(MONTH FROM b.booking_confirmation_date) = 11
  AND d.is_reefer = true
  AND b.job_status != 9
GROUP BY b.point_load, b.point_load_country;
```

#### Question 6: Marchandises Dangereuses par Destination
```sql
@supabase Analyze hazardous goods distribution:

SELECT
  b.point_disch_country as destination_country,
  b.point_disch as destination_port,
  COUNT(DISTINCT b.job_reference) as booking_count,
  SUM(d.nb_units) as total_hazardous_units,
  SUM(d.nb_teu) as total_hazardous_teu,
  ROUND(100.0 * COUNT(DISTINCT b.job_reference) /
    SUM(COUNT(DISTINCT b.job_reference)) OVER (), 2) as percentage
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE d.haz_flag = true
  AND b.job_status != 9
GROUP BY b.point_disch_country, b.point_disch
ORDER BY total_hazardous_teu DESC
LIMIT 15;
```

---

## 🚨 Alertes de Performance

### Seuils à Monitorer

```sql
@supabase Set up performance monitoring:

-- Alert si requête > 500ms
CREATE OR REPLACE VIEW slow_query_alerts AS
SELECT
  NOW() as alert_time,
  'SLOW_QUERY' as alert_type,
  query,
  mean_exec_time as avg_ms
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC;

-- Alert si cache hit ratio < 95%
CREATE OR REPLACE VIEW cache_alert AS
SELECT
  NOW() as alert_time,
  'LOW_CACHE_HIT' as alert_type,
  tablename,
  ROUND(
    100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0),
    2
  ) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
  AND heap_blks_hit + heap_blks_read > 1000
  AND 100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0) < 95;

-- Alert si index inutilisé (0 scans)
CREATE OR REPLACE VIEW unused_index_alerts AS
SELECT
  NOW() as alert_time,
  'UNUSED_INDEX' as alert_type,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as wasted_space
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexname NOT LIKE '%pkey';
```

---

## 💡 Tips Cursor + MCP

### 1. Context Windows

Dans Cursor, ajoutez ces fichiers au contexte :
- `supabase/migrations/*.sql`
- `.cursor/prompts/optimize-supabase-config.md`
- `IMPLEMENTATION_SUMMARY.md`

### 2. Commandes Rapides

**Créer un index :**
```
@supabase Create index CONCURRENTLY on bookings(shipcomp_code) if not exists
```

**Tester performance :**
```
@supabase EXPLAIN ANALYZE [votre requête]
```

**Vérifier données :**
```
@supabase SELECT COUNT(*), COUNT(DISTINCT column) FROM table WHERE condition
```

### 3. Debugging

**Si MCP ne répond pas :**
1. Vérifier `~/.cursor/mcp.json` syntaxe
2. Redémarrer Cursor
3. Vérifier credentials Supabase
4. Tester connexion PostgreSQL directe

**Si requêtes lentes :**
```
@supabase Show me the execution plan and suggest optimizations for: [requête]
```

---

## 📚 Ressources

- [Supabase MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/supabase)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html)

---

## ✅ Checklist Optimisation Complète

Utiliser dans Cursor :

```
@supabase Run this comprehensive optimization checklist:

[ ] 1. Verify all tables and columns exist
[ ] 2. Check row counts and data quality
[ ] 3. Create/verify 6 business query indexes
[ ] 4. Run ANALYZE on all tables
[ ] 5. Test 6 business queries with EXPLAIN ANALYZE
[ ] 6. Verify all execution times < 200ms
[ ] 7. Check cache hit ratio > 95%
[ ] 8. Identify unused indexes
[ ] 9. Create utility functions
[ ] 10. Set up monitoring views

Report results for each step.
```

---

**Avec ce guide, Cursor + MCP Supabase est configuré pour optimiser automatiquement la base de données CMA CGM !** 🚀
