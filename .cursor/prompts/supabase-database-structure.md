# Structure de la Base de Données Supabase - CMA CGM Talk to Data

## Vue d'ensemble

**Base de données** : PostgreSQL via Supabase  
**Dataset** : ~1.3M lignes de données shipping (2017-2021)  
**Modèle** : 2 tables principales + vues matérialisées + fonctions utilitaires  
**URL Supabase** : `https://zrdmmvhjfvtqoecrsdjt.supabase.co`

---

## Architecture des données

### Structure hiérarchique

```
BOOKINGS (1,189,237 enregistrements)
    ↓ relation 1-N
DTL_SEQUENCES (1,299,620 enregistrements)
```

**Ratio** : 1.09 conteneurs par booking en moyenne
- 93.91% des bookings ont 1 conteneur
- 6.09% des bookings ont 2+ conteneurs (max: 63 conteneurs)

---

## Table 1 : `bookings`

**Description** : Informations générales de réservation (niveau booking)  
**Clé primaire** : `job_reference`  
**Lignes** : 1,189,237  
**Taille** : 547 MB

### Colonnes (36 champs)

#### Identifiants et références
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `job_reference` | TEXT (PK) | Identifiant unique du booking | JREF_faf248d24e30 |
| `job_status` | INTEGER | Statut du booking (9 = annulé) | 70 |

#### Compagnie de transport (Shipper)
| Colonne | Type | Description | Valeurs possibles |
|---------|------|-------------|-------------------|
| `shipcomp_code` | TEXT | Code compagnie maritime | 0001, 0002, 0015, 0011 |
| `shipcomp_name` | TEXT | Nom compagnie | CMA CGM, APL, ANL, CHENG LIE |

**⚠️ Important** : `shipcomp_*` = TRANSPORTEUR (compagnie maritime), pas le client !

#### Client réel (Partner)
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `partner_code` | TEXT | Code client unique | 0002599371 |
| `partner_name` | TEXT | Nom du client | Décathlon Sports Kenya |
| `uo_name` | TEXT | Nom unité opérationnelle | Décathlon Sports Kenya |

**⚠️ Important** : `partner_*` = VRAI CLIENT (l'entreprise qui réserve)

#### Informations commerciales
| Colonne | Type | Description |
|---------|------|-------------|
| `commercial_haul` | TEXT | Type de trajet (HH, etc.) |
| `commercial_pole` | TEXT | Pôle commercial (NEUR, etc.) |
| `commercial_subtrade` | TEXT | Sous-trade commercial |
| `commercial_trade` | TEXT | Trade commercial (ASIA - NE, etc.) |
| `commercial_group_line` | TEXT | Groupe de ligne (ASIA LINES, etc.) |
| `contract_type` | TEXT | Type de contrat (Monthly, Spot, etc.) |

#### Origine et destination
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `origin` | TEXT | Région d'origine | FAR EAST |
| `destination` | TEXT | Région de destination | NORTH EUROPE |

#### Port de chargement (POL - Port of Loading)
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `point_load` | TEXT | Code port de chargement | CNTAO |
| `point_load_desc` | TEXT | Nom du port | QINGDAO |
| `point_load_country` | TEXT | Code pays | CN |
| `point_load_country_desc` | TEXT | Nom du pays | CHINA |

#### Port de déchargement (POD - Port of Discharge)
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `point_disch` | TEXT | Code port de déchargement | GBFXT |
| `point_disch_desc` | TEXT | Nom du port | FELIXSTOWE |
| `point_disch_country` | TEXT | Code pays | GB |
| `point_disch_country_desc` | TEXT | Nom du pays | UNITED KINGDOM |

#### Termes de mouvement
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `export_mvt_terms_desc` | TEXT | Termes export | Port |
| `import_mvt_terms_desc` | TEXT | Termes import | Port |

#### Dates
| Colonne | Type | Description | Format |
|---------|------|-------------|--------|
| `booking_confirmation_date` | DATE | Date confirmation | 2020-04-15 |
| `cancellation_date` | DATE | Date annulation | 2020-05-20 (si annulé) |

#### Voyage et service
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `voyage_reference` | TEXT | Référence du voyage | 0LA67W1MA |
| `service_no` | TEXT | Numéro de service | FAL6 |

#### Pays inland
| Colonne | Type | Description |
|---------|------|-------------|
| `inland_load_country` | TEXT | Pays inland chargement |
| `inland_disch_country` | TEXT | Pays inland déchargement |

#### Agent de réservation
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `booking_agent_office` | TEXT | Bureau agent | CC NORTH CHINA-QINGDAO |
| `booking_agent_country` | TEXT | Pays agent | CC NORTH CHINA |
| `booking_agent_ro` | TEXT | RO agent | RO SINGAPORE |

#### Timestamps automatiques
| Colonne | Type | Description |
|---------|------|-------------|
| `created_at` | TIMESTAMPTZ | Date création enregistrement |
| `updated_at` | TIMESTAMPTZ | Date dernière mise à jour |

---

## Table 2 : `dtl_sequences`

**Description** : Détails des conteneurs pour chaque booking (niveau conteneur)  
**Clé primaire** : `(job_reference, job_dtl_sequence)`  
**Clé étrangère** : `job_reference` → `bookings.job_reference`  
**Lignes** : 1,299,620  
**Taille** : 411 MB

### Colonnes (18 champs)

#### Identifiants
| Colonne | Type | Description |
|---------|------|-------------|
| `job_reference` | TEXT (FK) | Lien vers booking |
| `job_dtl_sequence` | INTEGER | Numéro séquence conteneur (1, 2, 3...) |

#### Type de conteneur
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `package_code` | TEXT | Type de conteneur | 20ST, 40HC, 45HC |

#### Flags spéciaux (booléens)
| Colonne | Type | Description |
|---------|------|-------------|
| `haz_flag` | BOOLEAN | Marchandise dangereuse |
| `reef_flag` | BOOLEAN | Conteneur réfrigéré (reefer) |
| `oog_flag` | BOOLEAN | Out of Gauge (hors gabarit) |
| `soc_flag` | BOOLEAN | Shipper Owned Container |
| `is_empty` | BOOLEAN | Conteneur vide (false = plein) |

#### Quantités et poids
| Colonne | Type | Description | Unité |
|---------|------|-------------|-------|
| `nb_units` | NUMERIC | Nombre d'unités | unités |
| `teus_booked` | NUMERIC | TEU réservés | TEU (Twenty-foot Equivalent Unit) |
| `net_weight_booked` | NUMERIC | Poids net réservé | tonnes |
| `unif_rate` | NUMERIC | Tarif uniforme | $ |

#### Classification de marchandise
| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `commodity_code_lara` | TEXT | Code commodité LARA | 940490 |
| `marketing_commodity_l0` | TEXT | Catégorie niveau 0 | CONSUMER & RETAIL |
| `marketing_commodity_l1` | TEXT | Catégorie niveau 1 | RETAIL |
| `marketing_commodity_l2` | TEXT | Catégorie niveau 2 | HOME FURNISHING & HOUSEWARES |

#### Timestamps automatiques
| Colonne | Type | Description |
|---------|------|-------------|
| `created_at` | TIMESTAMPTZ | Date création |
| `updated_at` | TIMESTAMPTZ | Date modification |

---

## Index de performance

### Index sur `bookings`

| Nom | Colonnes | Usage |
|-----|----------|-------|
| `bookings_pkey` | job_reference | Clé primaire |
| `idx_bookings_shipcomp` | shipcomp_code | Requêtes par transporteur |
| `idx_bookings_status` | job_status | Filtrage par statut |
| `idx_bookings_origin_dest` | origin, destination | Analyse routes |
| `idx_bookings_booking_date` | booking_confirmation_date | Requêtes temporelles |
| `idx_bookings_client_date` | shipcomp_code, booking_confirmation_date | Volume client/période |
| `idx_bookings_contract_trade` | contract_type, commercial_trade | Spot vs Long Terme |
| `idx_bookings_date_status` | booking_confirmation_date, job_status | Top clients |
| `idx_bookings_disch_country` | point_disch_country, point_disch | Marchandises dangereuses |
| `idx_bookings_partner_date` | partner_code, booking_confirmation_date | Requêtes par client réel |
| `idx_bookings_partner_status` | partner_code, job_status | Filtrage client/statut |

### Index sur `dtl_sequences`

| Nom | Colonnes | Usage |
|-----|----------|-------|
| `dtl_sequences_pkey` | job_reference, job_dtl_sequence | Clé primaire composite |
| `idx_dtl_commodity` | commodity_code_lara | Analyse commodités |
| `idx_dtl_sequences_flags` | job_reference INCLUDE (reef_flag, haz_flag, oog_flag) | Reefers et flags |
| `idx_dtl_sequences_booking_composite` | job_reference, teus_booked, nb_units | Optimisation jointures |

---

## Vues matérialisées

### 1. `mv_client_monthly_volumes`

**Description** : Volumes mensuels agrégés par CLIENT (partner)  
**Lignes** : 78,876  
**Rafraîchissement** : Manuel via `REFRESH MATERIALIZED VIEW`

#### Colonnes
| Colonne | Type | Description |
|---------|------|-------------|
| `partner_code` | TEXT | Code client |
| `partner_name` | TEXT | Nom client |
| `month` | DATE | Mois (1er du mois) |
| `booking_count` | BIGINT | Nombre de bookings |
| `total_teu` | NUMERIC | Total TEU |
| `total_units` | NUMERIC | Total unités |
| `total_weight` | NUMERIC | Total poids (tonnes) |

#### Index
- `idx_mv_client_monthly_partner_month` : (partner_code, month)
- `idx_mv_client_monthly_month` : (month)

#### Exemple d'utilisation
```sql
-- Évolution mensuelle Décathlon Kenya en 2020
SELECT * FROM mv_client_monthly_volumes 
WHERE partner_code = '0002599371' 
  AND month >= '2020-01-01' 
  AND month < '2021-01-01'
ORDER BY month;
```

### 2. `mv_shipper_monthly_volumes`

**Description** : Volumes mensuels agrégés par TRANSPORTEUR (shipcomp)  
**Lignes** : 52  
**Rafraîchissement** : Manuel

#### Colonnes
| Colonne | Type | Description |
|---------|------|-------------|
| `shipcomp_code` | TEXT | Code transporteur |
| `shipcomp_name` | TEXT | Nom transporteur |
| `month` | DATE | Mois |
| `booking_count` | BIGINT | Nombre de bookings |
| `total_teu` | NUMERIC | Total TEU |
| `total_units` | NUMERIC | Total unités |
| `total_weight` | NUMERIC | Total poids |

#### Index
- `idx_mv_shipper_monthly_shipper_month` : (shipcomp_code, month)
- `idx_mv_shipper_monthly_month` : (month)

### 3. `mv_port_volumes`

**Description** : Volumes agrégés par port (POL et POD)

#### Colonnes
| Colonne | Type | Description |
|---------|------|-------------|
| `port_type` | TEXT | POL ou POD |
| `port_code` | TEXT | Code du port |
| `port_country` | TEXT | Code pays |
| `booking_count` | BIGINT | Nombre de bookings |
| `total_teu` | NUMERIC | Total TEU |
| `total_units` | NUMERIC | Total unités |

#### Index
- `idx_mv_port_volumes_code` : (port_code)
- `idx_mv_port_volumes_country` : (port_country)

---

## Fonctions SQL utilitaires

### 1. `get_client_volume()`

**Description** : Calcule le volume TEU pour un CLIENT sur une période

#### Signature
```sql
get_client_volume(
  p_client_code TEXT,      -- Code client (partner_code)
  p_start_date DATE,       -- Date début
  p_end_date DATE          -- Date fin
)
RETURNS TABLE(
  total_teu NUMERIC,
  total_bookings BIGINT,
  avg_teu_per_booking NUMERIC
)
```

#### Exemple
```sql
-- Volume Décathlon Kenya en 2020
SELECT * FROM get_client_volume('0002599371', '2020-01-01', '2020-12-31');

-- Résultat : 225 TEU, 113 bookings, 1.99 TEU/booking
```

### 2. `get_top_clients()`

**Description** : Top N clients par volume TEU sur une période

#### Signature
```sql
get_top_clients(
  p_limit INT DEFAULT 10,           -- Nombre de clients à retourner
  p_start_date DATE DEFAULT NULL,   -- Date début (NULL = tout)
  p_end_date DATE DEFAULT NULL      -- Date fin (NULL = tout)
)
RETURNS TABLE(
  rank INT,
  partner_code TEXT,
  partner_name TEXT,
  total_teu NUMERIC,
  total_bookings BIGINT,
  percentage NUMERIC
)
```

#### Exemple
```sql
-- Top 10 clients en 2020
SELECT * FROM get_top_clients(10, '2020-01-01', '2020-12-31');

-- Top 20 clients all-time
SELECT * FROM get_top_clients(20);
```

### 3. `get_shipper_volume()`

**Description** : Calcule le volume TEU pour un TRANSPORTEUR sur une période

#### Signature
```sql
get_shipper_volume(
  p_shipper_code TEXT,     -- Code transporteur (shipcomp_code)
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_teu NUMERIC,
  total_bookings BIGINT,
  avg_teu_per_booking NUMERIC
)
```

#### Exemple
```sql
-- Volume CMA CGM en 2020
SELECT * FROM get_shipper_volume('0001', '2020-01-01', '2020-12-31');
```

### 4. `get_top_shippers()`

**Description** : Top N transporteurs par volume TEU

#### Signature
```sql
get_top_shippers(
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
)
```

---

## Statistiques des données

### Période couverte
- **Date min** : 2017-01-05
- **Date max** : 2021-03-18
- **Durée** : ~4 ans

### Répartition géographique
- **518 ports de chargement** uniques
- **609 ports de déchargement** uniques

### Clients (Partners)
- **27,401 clients uniques**
- Top client : AGACIA CEYLON PVT LTD (18,038 bookings)

### Transporteurs (Shippers)
| Transporteur | Bookings | Part de marché | TEU total |
|--------------|----------|----------------|-----------|
| CMA CGM (0001) | 871,664 | 73.3% | 2,280,024 |
| APL (0015) | 163,948 | 13.8% | 436,737 |
| ANL (0002) | 153,621 | 12.9% | 354,455 |
| CHENG LIE (0011) | 4 | 0.0% | - |

### Types de conteneurs
Les plus fréquents :
- 20ST (20 pieds standard)
- 40HC (40 pieds high cube)
- 40ST (40 pieds standard)
- 45HC (45 pieds high cube)

### Flags spéciaux
- **Reefers** (conteneurs réfrigérés) : ~5-10% des conteneurs
- **Marchandises dangereuses** (HAZ) : ~2-3%
- **Out of Gauge** (OOG) : ~1-2%

---

## Configuration Supabase

### Row Level Security (RLS)
- **Status** : DÉSACTIVÉ sur toutes les tables
- **Raison** : Optimisation performance pour app read-only

### Paramètres PostgreSQL
- **shared_buffers** : Optimisé pour dataset 1M+ lignes
- **work_mem** : 16MB
- **maintenance_work_mem** : 128MB

### Monitoring
Vue disponible : `index_usage`
```sql
SELECT * FROM index_usage 
WHERE tablename IN ('bookings', 'dtl_sequences')
ORDER BY idx_scan DESC;
```

---

## Patterns d'utilisation courants

### 1. Volume client sur période
```sql
-- Avec fonction utilitaire (rapide)
SELECT * FROM get_client_volume('0002599371', '2020-01-01', '2020-12-31');

-- Ou avec requête directe
SELECT 
  SUM(d.teus_booked) as total_teu,
  COUNT(DISTINCT b.job_reference) as bookings
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.partner_code = '0002599371'
  AND b.booking_confirmation_date BETWEEN '2020-01-01' AND '2020-12-31'
  AND b.job_status != 9;
```

### 2. Top routes (origine → destination)
```sql
SELECT 
  b.origin,
  b.destination,
  COUNT(DISTINCT b.job_reference) as bookings,
  SUM(d.teus_booked) as total_teu
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9
GROUP BY b.origin, b.destination
ORDER BY total_teu DESC
LIMIT 20;
```

### 3. Analyse Spot vs Contract
```sql
SELECT 
  b.contract_type,
  COUNT(DISTINCT b.job_reference) as bookings,
  SUM(d.teus_booked) as total_teu,
  AVG(d.unif_rate) as avg_rate
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9
  AND b.contract_type IS NOT NULL
GROUP BY b.contract_type
ORDER BY total_teu DESC;
```

### 4. Reefers par port
```sql
SELECT 
  b.point_load,
  b.point_load_desc,
  b.point_load_country,
  COUNT(*) as total_containers,
  SUM(CASE WHEN d.reef_flag = true THEN 1 ELSE 0 END) as reefer_count,
  ROUND(SUM(CASE WHEN d.reef_flag = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as reefer_percentage
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9
GROUP BY b.point_load, b.point_load_desc, b.point_load_country
HAVING SUM(CASE WHEN d.reef_flag = true THEN 1 ELSE 0 END) > 0
ORDER BY reefer_count DESC
LIMIT 20;
```

### 5. Évolution temporelle
```sql
SELECT 
  DATE_TRUNC('month', b.booking_confirmation_date) as month,
  COUNT(DISTINCT b.job_reference) as bookings,
  SUM(d.teus_booked) as total_teu,
  COUNT(DISTINCT b.partner_code) as unique_clients
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9
GROUP BY DATE_TRUNC('month', b.booking_confirmation_date)
ORDER BY month;
```

---

## Bonnes pratiques

### 1. Filtrer les bookings annulés
Toujours exclure `job_status = 9` dans les analyses :
```sql
WHERE b.job_status != 9
```

### 2. Utiliser les vues matérialisées
Pour les agrégations mensuelles, utiliser les vues pré-calculées :
```sql
-- ❌ Lent
SELECT ... FROM bookings ... GROUP BY DATE_TRUNC('month', ...)

-- ✅ Rapide
SELECT * FROM mv_client_monthly_volumes WHERE ...
```

### 3. Distinction Client vs Transporteur
- **Client** (qui paie) → `partner_code`, `partner_name`
- **Transporteur** (qui transporte) → `shipcomp_code`, `shipcomp_name`

### 4. Jointure bookings ↔ dtl_sequences
Toujours faire la jointure pour avoir les volumes :
```sql
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
```

### 5. Rafraîchir les vues matérialisées
Après import/modification de données :
```sql
REFRESH MATERIALIZED VIEW mv_client_monthly_volumes;
REFRESH MATERIALIZED VIEW mv_shipper_monthly_volumes;
REFRESH MATERIALIZED VIEW mv_port_volumes;
```

---

## Limitations connues

1. **Données historiques limitées**
   - Période : 2017-2021 (4 ans)
   - Données récentes manquantes (post-2021)

2. **Statut job_status**
   - Seule valeur documentée : 9 = annulé
   - Autres valeurs (70, etc.) non documentées

3. **Vues matérialisées**
   - Nécessitent refresh manuel
   - Pas de refresh automatique configuré

4. **Codes géographiques**
   - Codes pays non standardisés (CN, GB, etc.)
   - Descriptions en anglais uniquement

---

## Questions métier supportées

La base de données permet de répondre aux questions suivantes :

✅ Volume TEU par client sur période  
✅ Top N clients par volume  
✅ Analyse Spot vs Long Terme  
✅ Volumes par route (origine → destination)  
✅ Conteneurs réfrigérés par port  
✅ Marchandises dangereuses par destination  
✅ Évolution temporelle des volumes  
✅ Part de marché par transporteur  
✅ Analyse par type de marchandise (commodité)  
✅ Distribution géographique (ports, pays)  

---

## Accès via code

### TypeScript (Next.js / React)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Top 10 clients
const { data, error } = await supabase
  .rpc('get_top_clients', { p_limit: 10 });

// Requête simple
const { data: bookings } = await supabase
  .from('bookings')
  .select('*, dtl_sequences(*)')
  .eq('partner_code', '0002599371')
  .neq('job_status', 9);
```

---

## Dernière mise à jour

- **Date import** : 9 décembre 2025
- **Version schéma** : add_all_albert_school_fields + fix_client_vs_shipper
- **Optimisations** : Index complets, vues matérialisées, fonctions utilitaires
- **Performance** : < 200ms pour agrégations complexes sur 1M+ lignes

---

**Note finale** : Cette base de données est optimisée pour l'analyse et le reporting. Pour toute modification du schéma, créer une nouvelle migration dans `supabase/migrations/`.
