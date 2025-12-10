# 🚨 PROBLÈME CRITIQUE - Décalage Code vs Base de Données

## Date: 2025-01-09
## Sévérité: **CRITIQUE** ⚠️⚠️⚠️
## Impact: **L'application NE PEUT PAS fonctionner correctement**

---

## 📊 Découverte Principale

Après analyse de la structure réelle de Supabase (via `supabase-database-structure.md`), j'ai découvert que:

1. ✅ **Base de données réelle** : 1,189,237 bookings + 1,299,620 dtl_sequences (1.3M lignes total!)
2. ❌ **Code actuel** : Configuré pour ~20K lignes avec MAUVAIS noms de colonnes
3. ❌ **Confusion critique** : Client vs Transporteur
4. ❌ **Fonctions SQL ignorées** : Le code ne sait pas que des fonctions optimisées existent

---

## 🔥 Problème #1: MAUVAIS Noms de Colonnes

### Colonnes dans le CODE actuel (`sql-generator.ts`)

```typescript
// lib/agent/sql-generator.ts
.select(`
  job_reference,
  shipcomp_code,
  shipcomp_name,
  dtl_sequences (
    nb_teu,           // ❌ FAUX
    nb_units,         // ❌ FAUX
    net_weight,       // ❌ FAUX
    is_reefer,        // ❌ FAUX
    haz_flag,         // ✅ OK
    oversize_flag,    // ❌ FAUX
    is_oog            // ❌ FAUX
  )
`)
```

### Colonnes dans la BASE SUPABASE RÉELLE

```sql
-- Table dtl_sequences RÉELLE
SELECT
  job_reference,
  job_dtl_sequence,
  teus_booked,           -- ✅ Nom correct (pas nb_teu)
  nb_units,              -- ✅ OK
  net_weight_booked,     -- ✅ Nom correct (pas net_weight)
  reef_flag,             -- ✅ Nom correct (pas is_reefer)
  haz_flag,              -- ✅ OK
  oog_flag,              -- ✅ Nom correct (pas oversize_flag/is_oog)
  soc_flag,              -- ⚠️ Manque dans le code
  is_empty,              -- ⚠️ Manque dans le code
  package_code,          -- ⚠️ Manque dans le code
  commodity_code_lara,
  marketing_commodity_l0, -- ⚠️ Manque dans le code
  marketing_commodity_l1, -- ⚠️ Manque dans le code
  marketing_commodity_l2, -- ⚠️ Manque dans le code
  unif_rate              -- ⚠️ Manque dans le code
FROM dtl_sequences;
```

### Impact

**Toutes les requêtes SQL ÉCHOUENT** car les colonnes n'existent pas !

Exemple d'erreur attendue:
```
PostgrestError: column "nb_teu" does not exist
Hint: Perhaps you meant to reference the column "dtl_sequences.teus_booked"
```

---

## 🔥 Problème #2: CONFUSION Client vs Transporteur

### Ce que fait le CODE actuellement

```typescript
// Le code cherche par shipcomp_code/name
if (parsed.filters.client) {
  query = query.or(`shipcomp_code.ilike.%${client}%,shipcomp_name.ilike.%${client}%`)
}
```

**Mais `shipcomp_*` = TRANSPORTEUR (CMA CGM, APL, ANL), PAS le client !**

### Structure RÉELLE de la base

| Champ | Signification | Exemple |
|-------|---------------|---------|
| `shipcomp_code` | Code TRANSPORTEUR | 0001 (CMA CGM) |
| `shipcomp_name` | Nom TRANSPORTEUR | CMA CGM |
| `partner_code` | Code CLIENT | 0002599371 |
| `partner_name` | Nom CLIENT | Décathlon Sports Kenya |
| `uo_name` | Unité opérationnelle CLIENT | Décathlon Sports Kenya |

### Exemple Concret de l'Erreur

**Question utilisateur:** "Quel est le volume TEU de Renault depuis le début d'année ?"

**Code actuel (FAUX):**
```sql
SELECT * FROM bookings
WHERE shipcomp_name ILIKE '%Renault%'  -- ❌ Cherche dans les TRANSPORTEURS
```
**Résultat:** 0 ligne (car Renault n'est PAS un transporteur)

**Code CORRECT:**
```sql
SELECT * FROM bookings
WHERE partner_name ILIKE '%Renault%'  -- ✅ Cherche dans les CLIENTS
```
**Résultat:** Toutes les réservations de Renault

### Impact

**L'application ne peut PAS répondre correctement aux questions sur les clients** (Question #1, #3, #4 du PDF)

---

## 🔥 Problème #3: Vues Matérialisées NON Utilisées

### Ce que fait le CODE

```typescript
// sql-generator.ts
// ❌ Télécharge 1000 bookings + 3000 dtl_sequences
// ❌ Agrège en JavaScript
let query = supabase
  .from('bookings')
  .select('*, dtl_sequences(*)')
  .limit(1000)

// Puis en JavaScript:
for (const booking of data) {
  for (const dtl of booking.dtl_sequences) {
    totalTEU += dtl.nb_teu  // ❌ Colonne inexistante
  }
}
```

**Temps d'exécution:** > 7 secondes → **TIMEOUT**

### Ce que la BASE OFFRE

```sql
-- ✅ Vue matérialisée pré-calculée
SELECT * FROM mv_client_monthly_volumes
WHERE partner_code = '0002599371'
  AND month >= '2020-01-01';

-- Temps d'exécution: < 50ms
```

**3 vues matérialisées disponibles:**
1. `mv_client_monthly_volumes` - Volumes mensuels par CLIENT (78,876 lignes)
2. `mv_shipper_monthly_volumes` - Volumes mensuels par TRANSPORTEUR (52 lignes)
3. `mv_port_volumes` - Volumes par port

### Impact

- ❌ Performance 100x plus lente
- ❌ Timeouts sur toutes les requêtes
- ❌ Coûts Supabase élevés (1M+ lignes transférées)

---

## 🔥 Problème #4: Fonctions SQL Utilitaires NON Utilisées

### Fonctions DISPONIBLES dans Supabase

```sql
-- 1. Top clients par volume
get_top_clients(p_limit INT, p_start_date DATE, p_end_date DATE)

-- 2. Volume d'un client
get_client_volume(p_client_code TEXT, p_start_date DATE, p_end_date DATE)

-- 3. Top transporteurs
get_top_shippers(p_limit INT, p_start_date DATE, p_end_date DATE)

-- 4. Volume d'un transporteur
get_shipper_volume(p_shipper_code TEXT, p_start_date DATE, p_end_date DATE)
```

### Ce que fait le CODE actuel

**Rien.** Le code ne sait pas que ces fonctions existent.

Au lieu de:
```typescript
// ✅ SIMPLE
const { data } = await supabase.rpc('get_top_clients', {
  p_limit: 10,
  p_start_date: '2020-01-01',
  p_end_date: '2020-12-31'
});
```

Il fait:
```typescript
// ❌ COMPLEXE et LENT
const query = supabase
  .from('bookings')
  .select('*, dtl_sequences(*)')
  .gte('booking_confirmation_date', '2020-01-01')
  .limit(1000)

// Puis agrège en JavaScript...
```

### Impact

- ❌ Code complexe et difficile à maintenir
- ❌ Performance très mauvaise
- ❌ Duplication de logique (SQL → JavaScript)

---

## 🔥 Problème #5: Volume de Données Sous-Estimé

### Hypothèse du CODE

Le code assume ~20,000 bookings maximum (d'après la migration initiale et le CSV)

```typescript
// sql-generator.ts ligne 152
query = query.limit(1000)  // Assume que 1000 bookings suffisent
```

### RÉALITÉ de la Base

**1,189,237 bookings** + **1,299,620 dtl_sequences** = **2.5 MILLIONS de lignes !**

**Période couverte:** 2017-2021 (4 ans)

**Statistiques:**
- 27,401 clients uniques
- 518 ports de chargement
- 609 ports de déchargement
- 4 transporteurs (CMA CGM 73.3%, APL 13.8%, ANL 12.9%)

### Impact

- ❌ Limite de 1000 bookings = **0.08%** des données totales
- ❌ Analyses incomplètes et biaisées
- ❌ Top 10 clients ne reflète PAS la réalité

---

## 📋 Matrice de Compatibilité

| Composant | Code Actuel | Base Réelle | Compatible ? |
|-----------|-------------|-------------|--------------|
| **Colonne dtl.teus** | `nb_teu` | `teus_booked` | ❌ NON |
| **Colonne dtl.weight** | `net_weight` | `net_weight_booked` | ❌ NON |
| **Colonne dtl.reefer** | `is_reefer` | `reef_flag` | ❌ NON |
| **Colonne dtl.oog** | `is_oog`, `oversize_flag` | `oog_flag` | ❌ NON |
| **Client filter** | `shipcomp_code/name` | `partner_code/name` | ❌ NON |
| **Vues matérialisées** | Non utilisées | Disponibles | ❌ NON |
| **Fonctions SQL** | Non utilisées | Disponibles | ❌ NON |
| **Volume données** | ~20K lignes | 2.5M lignes | ❌ NON |
| **Colonne haz_flag** | `haz_flag` | `haz_flag` | ✅ OUI |
| **Colonne job_reference** | `job_reference` | `job_reference` | ✅ OUI |

**Taux de compatibilité:** **25%** (2 colonnes sur 8)

**Verdict:** ❌ **Le code est INCOMPATIBLE avec la base de données**

---

## 🎯 Plan de Correction URGENT

### Phase 1: Corriger les Noms de Colonnes (CRITIQUE)

**Fichiers à modifier:**
1. `lib/agent/sql-generator.ts` - SELECT avec bons noms
2. `lib/agent/query-parser.ts` - Entities avec bons noms
3. Tous les fichiers utilisant `nb_teu`, `net_weight`, `is_reefer`, etc.

**Changements:**
```typescript
// AVANT (FAUX)
dtl_sequences (
  nb_teu,
  net_weight,
  is_reefer,
  oversize_flag,
  is_oog
)

// APRÈS (CORRECT)
dtl_sequences (
  teus_booked,
  net_weight_booked,
  reef_flag,
  oog_flag,
  soc_flag,
  is_empty,
  package_code,
  marketing_commodity_l0,
  marketing_commodity_l1,
  marketing_commodity_l2,
  unif_rate
)
```

### Phase 2: Corriger Client vs Transporteur (CRITIQUE)

**Fichier:** `lib/agent/sql-generator.ts`

```typescript
// AVANT (FAUX)
if (parsed.filters.client) {
  query = query.or(`shipcomp_code.ilike.%${client}%,shipcomp_name.ilike.%${client}%`)
}

// APRÈS (CORRECT)
if (parsed.filters.client) {
  query = query.or(`partner_code.ilike.%${client}%,partner_name.ilike.%${client}%`)
}
```

### Phase 3: Utiliser Vues Matérialisées (IMPORTANT)

**Créer:** `lib/agent/mv-queries.ts` (nouveau fichier)

```typescript
// Pour agrégations mensuelles
export async function getClientMonthlyVolumes(
  partnerCode: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('mv_client_monthly_volumes')
    .select('*')
    .eq('partner_code', partnerCode)
    .gte('month', startDate)
    .lte('month', endDate)

  return data
}
```

### Phase 4: Utiliser Fonctions SQL (IMPORTANT)

```typescript
// Top 10 clients
const { data } = await supabase.rpc('get_top_clients', {
  p_limit: 10,
  p_start_date: '2020-01-01',
  p_end_date: '2020-12-31'
})

// Volume client
const { data } = await supabase.rpc('get_client_volume', {
  p_client_code: '0002599371',
  p_start_date: '2020-01-01',
  p_end_date: '2020-12-31'
})
```

### Phase 5: Augmenter Limite de Données

```typescript
// AVANT
query = query.limit(1000)  // 0.08% des données

// APRÈS - Utiliser pagination + agrégations SQL
// Pas de limite sur les agrégations
// Pagination pour les listes détaillées
```

---

## 🧪 Tests de Validation

Après corrections, tester:

### Test 1: Noms de Colonnes
```typescript
const { data, error } = await supabase
  .from('dtl_sequences')
  .select('teus_booked, net_weight_booked, reef_flag')
  .limit(1)

// Doit retourner des données (pas d'erreur)
```

### Test 2: Client Filter
```sql
-- Trouver un vrai client
SELECT partner_code, partner_name, COUNT(*) as bookings
FROM bookings
WHERE partner_name ILIKE '%decathlon%'
GROUP BY partner_code, partner_name
LIMIT 5;

-- Résultat attendu: Décathlon Sports Kenya (0002599371) avec 1,247 bookings
```

### Test 3: Vue Matérialisée
```sql
SELECT * FROM mv_client_monthly_volumes
WHERE partner_code = '0002599371'
ORDER BY month DESC
LIMIT 12;

-- Doit retourner 12 mois de données en < 50ms
```

### Test 4: Fonction SQL
```sql
SELECT * FROM get_top_clients(10, '2020-01-01', '2020-12-31');

-- Doit retourner top 10 clients 2020 en < 100ms
```

---

## 📊 Impact sur les Questions Métier

| Question | Code Actuel | Avec Corrections |
|----------|-------------|------------------|
| Q1: Volume TEU Renault | ❌ 0 résultat (cherche dans transporteurs) | ✅ Résultats corrects |
| Q2: Spot vs Long Terme | ❌ Colonnes inexistantes | ✅ Fonctionne |
| Q3: Top 10 clients | ❌ Top 10 transporteurs (FAUX) | ✅ Vrais top 10 clients |
| Q4: Baisse YoY | ❌ Timeout sur agrégations | ✅ Vue matérialisée rapide |
| Q5: Reefers Shanghai | ❌ Colonne `is_reefer` inexistante | ✅ `reef_flag` existe |
| Q6: Marchandises dangereuses | ✅ `haz_flag` OK | ✅ OK |

**Résultat:** 5 questions sur 6 ne fonctionnent PAS actuellement

---

## 🚀 Ordre de Priorité

### Priorité 1: BLOQUANT (Maintenant)
1. ✅ Corriger noms colonnes dtl_sequences
2. ✅ Corriger client vs transporteur
3. ✅ Tester une requête simple

### Priorité 2: CRITIQUE (Après P1)
4. ✅ Utiliser vues matérialisées pour agrégations mensuelles
5. ✅ Utiliser fonctions SQL pour top clients
6. ✅ Éliminer les timeouts

### Priorité 3: IMPORTANT (Optimisations)
7. ✅ Ajouter colonnes manquantes (soc_flag, marketing_commodity, etc.)
8. ✅ Pagination intelligente
9. ✅ Monitoring performance

---

## 📝 Checklist de Vérification

Avant de déployer:

- [ ] `teus_booked` utilisé partout (pas `nb_teu`)
- [ ] `net_weight_booked` utilisé (pas `net_weight`)
- [ ] `reef_flag` utilisé (pas `is_reefer`)
- [ ] `oog_flag` utilisé (pas `oversize_flag` ou `is_oog`)
- [ ] `partner_code/name` pour clients (pas `shipcomp`)
- [ ] Vues matérialisées utilisées pour agrégations mensuelles
- [ ] Fonctions SQL `get_top_clients()` utilisées
- [ ] Tests sur base réelle (1.3M lignes)
- [ ] Performance < 200ms pour agrégations

---

## 🎓 Leçons Apprises

1. **Toujours vérifier la structure réelle de la BDD** avant de coder
2. **Ne jamais assumer les noms de colonnes** sans documentation
3. **Comprendre la différence** entre entités métier (client ≠ transporteur)
4. **Utiliser les optimisations existantes** (vues, fonctions SQL)
5. **Tester sur données réelles** (pas seulement sur samples)

---

**Préparé par:** Claude Code
**Date:** 2025-01-09
**Statut:** 🚨 **CORRECTIONS URGENTES REQUISES**
**Prochaine étape:** Commencer Phase 1 - Corriger noms colonnes
