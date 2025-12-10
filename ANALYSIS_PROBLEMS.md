# 🔍 Analyse des Problèmes - CMA CGM Talk to Data

## Date: 2025-01-09
## Analyseur: Claude Code
## Statut: **CRITIQUE** - Plusieurs problèmes majeurs identifiés

---

## 📋 Résumé Exécutif

L'IA actuelle ne répond pas correctement aux attentes du PDF CMA CGM pour les raisons suivantes:

1. ❌ **Timeout des requêtes SQL** - Les requêtes prennent > 7 secondes et échouent
2. ❌ **Absence de champs critiques** - La migration SQL n'a pas été exécutée (contract_type, commercial_trade manquants)
3. ❌ **Mauvaise structure de JOIN** - La jointure 1-N bookings → dtl_sequences est inefficace
4. ❌ **Agrégation incorrecte** - Les calculs de volume TEU ne sont pas faits au bon niveau
5. ❌ **Réponses génériques** - Le LLM génère des réponses sans vraiment comprendre la structure des données
6. ❌ **Visualisations inadaptées** - Les graphiques ne correspondent pas aux attentes du PDF

---

## 🚨 Problème #1: Timeout des Requêtes SQL (CRITIQUE)

### Symptôme

```
Error: Database query failed: canceling statement due to statement timeout
```

### Test Effectué

```bash
curl POST /api/query
Query: "Quel est le volume TEU total pour l'année 2019?"
Résultat: Timeout après 7 secondes
```

### Cause Racine

Le `sql-generator.ts` utilise cette requête:

```typescript
let query = supabase
  .from('bookings')
  .select(`
    job_reference,
    ...
    dtl_sequences (
      job_dtl_sequence,
      nb_teu,
      ...
    )
  `, { count: 'exact' })
```

**Problèmes:**
1. ❌ Jointure LEFT JOIN implicite charge TOUTES les dtl_sequences pour chaque booking
2. ❌ `count: 'exact'` force un scan complet de la table
3. ❌ `.limit(1000)` s'applique aux bookings, mais peut retourner 3000+ dtl_sequences (3x plus!)
4. ❌ Aucune agrégation côté SQL - tout est fait côté JavaScript

###Impact

- Requêtes simples => **TIMEOUT**
- Volume de données transférées: **Très élevé** (20K bookings × 3 dtl_sequences = 60K lignes)
- Performance utilisateur: **Inacceptable** (> 7 secondes pour échouer)

### Solution Requise

**URGENT**: Réécrire le sql-generator avec:
1. Agrégations SQL côté Supabase (GROUP BY, SUM)
2. Vue matérialisée pour les calculs de volume pré-calculés
3. Index appropriés sur `booking_confirmation_date + shipcomp_code`
4. Pagination intelligente

---

## 🚨 Problème #2: Champs de Base de Données Manquants (BLOQUANT)

### Situation

La migration `20250110_add_missing_fields.sql` existe MAIS n'a pas été exécutée dans Supabase.

### Champs Manquants dans Production

**Table `bookings`:**
- ❌ `contract_type` - **BLOQUE Question #2** (Spot vs Long Terme)
- ❌ `commercial_trade` - **BLOQUE les filtres par trade**
- ❌ `commercial_subtrade`
- ❌ `commercial_pole`
- ❌ `commercial_haul`
- ❌ `commercial_group_line`
- ❌ `voyage_ref_jh`
- ❌ `unif_rate`
- ❌ `point_from` / `point_to`

**Table `dtl_sequences`:**
- ❌ `soc_flag`
- ❌ `is_empty`
- ❌ `marketing_commodity_l0/l1/l2`

### Impact sur les Questions Métier

| Question | Champs Requis | Statut |
|----------|---------------|--------|
| Q1: Volume TEU Renault | ✅ shipcomp_name, nb_teu | **OK** |
| Q2: Spot vs Long Terme | ❌ contract_type | **BLOQUÉ** |
| Q3: Top 10 clients | ✅ shipcomp_name, nb_teu | **OK** |
| Q4: Baisse > 20% YoY | ✅ booking_confirmation_date | **OK** |
| Q5: Reefers Shanghai | ✅ point_load, is_reefer | **OK** |
| Q6: Marchandises dangereuses | ✅ point_disch, haz_flag | **OK** |

**Résultat:** 1 question sur 6 est BLOQUÉE, et les analyses avancées sont limitées.

### Solution Requise

**URGENT**: Exécuter la migration SQL dans Supabase:

```bash
# Option 1: Via Supabase SQL Editor
1. Aller sur https://zrdmmvhjfvtqoecrsdjt.supabase.co
2. SQL Editor
3. Copier-coller supabase/migrations/20250110_add_missing_fields.sql
4. Exécuter

# Option 2: Via script (si permissions disponibles)
npx tsx scripts/run-migration.ts
```

---

## 🚨 Problème #3: Agrégation Incorrecte

### Situation Actuelle

Le code télécharge ALL les bookings avec ALL leurs dtl_sequences, puis agrège côté JavaScript:

```typescript
// Dans route.ts ligne 152
const statistics = getStatistics(queryResult.data, queryResult.totalCount)

// getStatistics.ts fait:
for (const booking of data) {
  for (const dtl of booking.dtl_sequences) {
    totalTEU += dtl.nb_teu
  }
}
```

### Problèmes

1. ❌ Transfère 60K lignes depuis Supabase vers Next.js
2. ❌ Aggè en JavaScript au lieu de SQL (100x plus lent)
3. ❌ Impossible de gérer > 100K bookings à l'avenir
4. ❌ Coûts élevés de bande passante Supabase

### Attente du PDF (Page 21)

> "Exactitude des agrégations mathématiques (SUM, AVG, COUNT), calculs de ratios précis, **gestion correcte des valeurs NULL**. Compréhension des relations booking/dtl_sequence et **agrégation au bon niveau** de granularité."

**Notre code NE RESPECTE PAS cette exigence.**

### Solution Requise

Utiliser les agrégations Supabase natives:

```sql
-- Au lieu de charger toutes les données:
SELECT
  b.shipcomp_code,
  b.shipcomp_name,
  SUM(d.nb_teu) as total_teu,
  SUM(d.nb_units) as total_units,
  COUNT(DISTINCT b.job_reference) as booking_count
FROM bookings b
INNER JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.booking_confirmation_date >= '2019-01-01'
  AND b.booking_confirmation_date < '2020-01-01'
  AND b.job_status != 9
GROUP BY b.shipcomp_code, b.shipcomp_name
ORDER BY total_teu DESC
LIMIT 10
```

---

## 🚨 Problème #4: Réponses LLM Génériques

### Situation Actuelle

Le `route.ts:generateResponse()` génère des réponses avec un prompt générique:

```typescript
const prompt = `You are a data analyst for CMA CGM's shipping booking database. Generate a concise response.

DATA SUMMARY:
- Total bookings: ${totalCount}
- Total TEU: ${statistics.totalTEU}
...`
```

### Problèmes

1. ❌ Le LLM ne comprend PAS la structure hiérarchique Booking/dtl_sequence
2. ❌ Les statistiques sont agrégées en JavaScript, donc imprécises
3. ❌ Aucune validation de la cohérence avec la base de données
4. ❌ Pas d'insights proactifs liés au contexte shipping

### Attente du PDF (Page 23)

> "**Détection d'anomalies** (5 pts): Écarts significatifs par rapport aux tendances
> **Identification de patterns** (5 pts): Reconnaissance automatique des motifs récurrents
> **Recommandations business** (5 pts): Suggestions d'actions concrètes basées sur les données"

**Notre code génère des insights GÉNÉRIQUES, pas spécifiques au shipping CMA CGM.**

### Exemple de Réponse Actuelle

```
"J'ai trouvé 849,017 bookings dans la base.
Le volume total est de 1,234,567 TEU.
Les principaux clients sont..."
```

### Exemple de Réponse Attendue (selon PDF)

```
"Analyse Volume TEU 2019 - Renault

Volume Total: 15,234 TEU sur 567 bookings
Tendance: +12% vs 2018

Insights Proactifs:
⚠️ Concentration risquée: 78% du volume sur trade Asia-Europe
💡 Opportunité: Spot en hausse de 23% (considérer contrats Long Terme)
📊 Pic saisonnier: Volumes +35% en T4 2019 (préparer capacité pour T4 2020)

Recommandations:
1. Diversifier les routes (explorer Transpacific)
2. Proposer contrat annuel à Renault (volume prévisible)
3. Analyser la baisse de 18% sur reefers (enquête qualité?)
```

### Solution Requise

Réécrire `generateResponse()` avec:
1. Prompt spécialisé shipping (reconnaître POL/POD, trade routes, flags)
2. Template de réponse structurée (Volume → Tendance → Insights → Recommandations)
3. Validation de cohérence: vérifier que les chiffres matchent les données SQL
4. Détection d'anomalies: comparer vs moyennes, vs N-1, vs prévisions

---

## 🚨 Problème #5: Visualisations Inadaptées

### Situation Actuelle

Le `chart-selector.ts` génère automatiquement des graphiques basés sur le type de données:

```typescript
function generateChartConfigs(parsed, aggregations, statistics) {
  // Génère automatiquement: bar, pie, line
}
```

### Problèmes

1. ❌ Pas de graphiques **géographiques** (heatmap ports/pays)
2. ❌ Pas de graphiques **temporels** comparatifs (YoY, tendances)
3. ❌ Pas de **scatter plots** (corrélations volume/tarif)
4. ❌ Pas de graphiques **multi-axes** (volume + revenus)

### Attente du PDF (Page 22)

Types de visualisations requis:
- ✅ **Évolution temporelle** (Line chart) - Partiellement OK
- ✅ **Comparaison de catégories** (Bar chart) - OK
- ✅ **Répartition/proportion** (Pie chart) - OK
- ❌ **Géographie** (Map chart/Heatmap) - **MANQUANT**
- ❌ **Corrélation entre variables** (Scatter plot) - **MANQUANT**
- ❌ **Distribution** (Histogram/Boxplot) - **MANQUANT**

**Notre code ne génère que 3 types sur 6 requis.**

### Solution Requise

Créer de nouveaux types de graphiques:

1. **Geographic Heatmap** (déjà créé: `GeographicHeatmap.tsx`)
   - Utiliser pour: répartition volumes par pays/port
   - Afficher top countries avec gradients de couleur

2. **Temporal Comparison** (à créer)
   - Line chart multi-séries (2018 vs 2019 vs 2020)
   - Highlighting anomalies/spikes

3. **Correlation Scatter** (à créer)
   - nb_teu vs unif_rate (identifier clients rentables)
   - booking_count vs total_weight (efficacité loading)

---

## 🚨 Problème #6: Structure de la Réponse

### Situation Actuelle

Le `route.ts` retourne:

```json
{
  "success": true,
  "data": {
    "text": "Je vous informe que...",
    "rawData": [...], // 1000 bookings
    "statistics": {...},
    "charts": [...]
  }
}
```

### Problèmes

1. ❌ `rawData` charge 1000 bookings complets (inutile pour l'utilisateur)
2. ❌ Pas de section dédiée "Insights" / "Recommandations"
3. ❌ Pas de transparence sur les filtres appliqués
4. ❌ Pas de métrique de confiance de la réponse

### Attente du PDF (Page 21)

> "**Complétude de la réponse** (8 pts): Affichage clair du **chiffre principal demandé** avec **contexte additionnel pertinent** (période, filtres). **Transparence** sur les filtres appliqués, nombre de lignes analysées et date des données."

**Notre réponse ne montre PAS clairement:**
- Le chiffre principal (ex: "15,234 TEU")
- Les filtres appliqués (ex: "Renault, 2019, status=Active")
- Le contexte (ex: "+12% vs 2018")

### Solution Requise

Structurer la réponse comme suit:

```json
{
  "success": true,
  "data": {
    "answer": {
      "primaryMetric": {
        "label": "Volume TEU Total",
        "value": "15,234 TEU",
        "trend": "+12%",
        "vs": "2018"
      },
      "secondaryMetrics": [
        {"label": "Bookings", "value": "567"},
        {"label": "Avg TEU/Booking", "value": "26.8"}
      ],
      "context": {
        "period": {"start": "2019-01-01", "end": "2019-12-31"},
        "filtersApplied": {"client": "Renault", "status": "Active"},
        "rowsAnalyzed": 567,
        "dataFreshness": "2025-01-09"
      }
    },
    "narrative": "Votre volume TEU pour 2019 est de 15,234 TEU...",
    "insights": {
      "anomalies": [...],
      "patterns": [...],
      "recommendations": [...]
    },
    "visualizations": [...],
    "confidence": 0.95
  }
}
```

---

## 📊 Matrice de Conformité avec le PDF

| Critère | Poids | Statut Actuel | Score |
|---------|-------|---------------|-------|
| **1. Compréhension langage naturel** | 25 pts | 🟡 Partiel | 15/25 |
| - Robustesse linguistique | 10 pts | ✅ OK | 8/10 |
| - Compréhension contextuelle | 8 pts | 🟡 Moyen | 4/8 |
| - Gestion ambiguïté | 7 pts | 🟡 Basique | 3/7 |
| **2. Pertinence et exactitude** | 25 pts | 🔴 Critique | 8/25 |
| - Précision calculs | 12 pts | ❌ Imprécis | 3/12 |
| - Complétude réponse | 8 pts | 🟡 Moyen | 4/8 |
| - Gestion cas limites | 5 pts | ❌ Timeout | 1/5 |
| **3. Qualité visualisations** | 20 pts | 🟡 Partiel | 12/20 |
| - Types graphiques | - | 🟡 3/6 types | - |
| - Interactivité | - | ✅ OK | - |
| **4. Suggestions et insights** | 15 pts | 🔴 Faible | 5/15 |
| - Détection anomalies | 5 pts | 🟡 Basique | 2/5 |
| - Patterns | 5 pts | 🔴 Générique | 1/5 |
| - Recommandations | 5 pts | 🔴 Faibles | 2/5 |
| **5. UX conversationnelle** | 10 pts | ✅ Bon | 8/10 |
| **6. Qualité technique** | 5 pts | 🔴 Critique | 2/5 |
| - Performance | - | ❌ Timeout | - |
| - Sécurité | - | ✅ OK | - |
| **TOTAL** | **100 pts** | - | **50/100** |

**Verdict:** ❌ **Score insuffisant pour être compétitif. Corrections URGENTES requises.**

---

## 🎯 Plan d'Action Prioritaire

### Phase 1: CRITIQUE - Déblocage Immédiat (2-3h)

1. ✅ **Exécuter migration SQL** `20250110_add_missing_fields.sql`
   → Débloque Question #2 (Spot vs Long Terme)

2. ❌ **Réécrire sql-generator.ts**
   → Utiliser agrégations SQL natives
   → Éliminer les timeouts
   → **PRIORITÉ #1**

3. ❌ **Optimiser les requêtes**
   → Créer vue matérialisée `mv_client_monthly_volumes`
   → Ajouter index composites

### Phase 2: IMPORTANT - Amélioration Réponses (3-4h)

4. ❌ **Réécrire generateResponse()**
   → Template structuré (Métrique → Contexte → Insights)
   → Prompts spécialisés shipping

5. ❌ **Améliorer insights proactifs**
   → Détection anomalies vs moyennes
   → Patterns spécifiques shipping (saisonnalité, trade shifts)
   → Recommandations actionnables

### Phase 3: AMÉLIORATION - Visualisations (2-3h)

6. ❌ **Ajouter graphiques manquants**
   → Geographic Heatmap (déjà créé)
   → Temporal Comparison (YoY)
   → Correlation Scatter

7. ❌ **Structurer la réponse API**
   → Format `answer + narrative + insights + viz`
   → Transparence filtres/contexte

---

## 🚀 Quick Wins Immédiats (< 30min chacun)

1. **Limiter rawData** dans la réponse API (réduire de 1000 à 10 lignes)
2. **Afficher les filtres appliqués** en haut de la réponse
3. **Ajouter un indicateur de confiance** (0-1) à chaque réponse
4. **Documenter les cas d'erreur** avec messages clairs pour l'utilisateur

---

## 📚 Ressources et Références

- **PDF Specification**: `Challenge_T2D_CMA CGM Lignes v2 (2).pdf`
- **Migration SQL**: `supabase/migrations/20250110_add_missing_fields.sql`
- **Fichiers à corriger**:
  - `lib/agent/sql-generator.ts` (PRIORITÉ #1)
  - `app/api/query/route.ts` (generateResponse)
  - `lib/agent/chart-selector.ts` (visualisations)

---

**Préparé par:** Claude Code
**Date:** 2025-01-09
**Prochaine étape:** Commencer Phase 1 - Corrections CRITIQUES
