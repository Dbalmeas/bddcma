# 🚀 Guide Rapide - Actions Requises

## ⚠️ Actions Manuelles Nécessaires

### 1. Exécuter la Migration SQL (REQUIS)

**Dans l'interface Supabase SQL Editor:**

1. Aller sur [https://zrdmmvhjfvtqoecrsdjt.supabase.co](https://zrdmmvhjfvtqoecrsdjt.supabase.co)
2. Cliquer sur "SQL Editor"
3. Copier le contenu de `supabase/migrations/20250110_add_missing_fields.sql`
4. Coller et exécuter le SQL

**OU via le script:**
```bash
npx tsx scripts/run-migration.ts
# Si échec, copier le SQL affiché et l'exécuter manuellement
```

---

### 2. Réingérer les Données CSV (RECOMMANDÉ)

**Pour avoir tous les nouveaux champs (contract_type, commercial_trade, etc.):**

```bash
# Optionnel: Supprimer les anciennes données d'abord
# Dans Supabase SQL Editor:
# DELETE FROM dtl_sequences;
# DELETE FROM bookings;

# Réingérer
npx tsx scripts/ingest-albert-school-csv.ts
```

**Durée estimée:** 2-3 minutes pour 20,000 lignes

---

### 3. Tester les Nouvelles Fonctionnalités

**Lancer l'application:**
```bash
npm run dev
```

**Tester les 6 questions métier du PDF:**

1. ✅ "Quel est le volume TEU de Renault depuis le début d'année ?"
2. ⚠️ "Part Spot vs Long Terme sur la trade Asie-Europe" (nécessite classification du contract_type)
3. ✅ "Top 10 clients par volume dernier trimestre"
4. ⚠️ "Clients avec volume en baisse > 20% vs N-1" (nécessite comparaison YoY)
5. ✅ "Nombre de reefers au départ Shanghai en novembre"
6. ✅ "Répartition des marchandises dangereuses par destination"

---

## 📦 Nouveaux Composants Créés

### 1. AnomalyAlert.tsx
**Usage:**
```tsx
import { AnomalyAlert, type Anomaly } from '@/components/AnomalyAlert'

const anomalies: Anomaly[] = [
  {
    type: 'drop',
    severity: 'high',
    title: 'Baisse significative de volume',
    description: 'Volume TEU en baisse de 45% ce mois-ci',
    value: '1,234 TEU',
    comparison: '-45% vs mois dernier',
    recommendation: 'Analyser les causes et contacter les clients concernés'
  }
]

<AnomalyAlert anomalies={anomalies} />
```

### 2. GeographicHeatmap.tsx
**Usage:**
```tsx
import { GeographicHeatmap, type GeoData } from '@/components/GeographicHeatmap'

const geoData: GeoData[] = [
  {
    country: 'Chine',
    countryCode: 'CN',
    value: 15000,
    percentage: 35.5,
    trend: 'up'
  },
  // ...
]

<GeographicHeatmap
  data={geoData}
  title="Volume par pays de destination"
  metric="TEU"
/>
```

### 3. Export PDF
**Usage:**
```tsx
import { exportReportToPDF } from '@/lib/utils/pdf-export'

await exportReportToPDF({
  title: 'Analyse Volume TEU 2019',
  subtitle: 'Client Renault',
  query: 'Quel est le volume TEU de Renault depuis le début d\'année ?',
  response: 'Le volume total est de 15,234 TEU...',
  statistics: {
    'Volume Total TEU': 15234,
    'Nombre de Bookings': 567,
    'Top Client': 'Renault'
  },
  charts: [document.getElementById('myChart')],
  insights: [
    'Volume en hausse de 12% par rapport à N-1',
    'Concentration sur la trade Asie-Europe (78%)'
  ]
})
```

---

## 🔍 Vérifications Post-Migration

### Vérifier les nouveaux champs

**Dans Supabase SQL Editor:**
```sql
-- Vérifier les colonnes bookings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('contract_type', 'commercial_trade', 'unif_rate');

-- Vérifier les données
SELECT contract_type, commercial_trade, COUNT(*) as count
FROM bookings
GROUP BY contract_type, commercial_trade
ORDER BY count DESC
LIMIT 10;
```

### Vérifier les index

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('bookings', 'dtl_sequences')
AND indexname LIKE 'idx_%contract%' OR indexname LIKE 'idx_%commercial%';
```

---

## 📊 Nouveaux Champs Disponibles

### Table `bookings`

| Champ | Type | Description |
|-------|------|-------------|
| `contract_type` | TEXT | Type de contrat (Quarterly, Monthly, Yearly, codes régionaux) |
| `unif_rate` | NUMERIC | Tarif unitaire du transport |
| `commercial_trade` | TEXT | Route commerciale principale (ex: Asia-Europe) |
| `commercial_subtrade` | TEXT | Sous-route commerciale plus précise |
| `commercial_pole` | TEXT | Pôle commercial |
| `commercial_haul` | TEXT | Type de trajet maritime |
| `commercial_group_line` | TEXT | Ligne commerciale du groupe |
| `voyage_ref_jh` | TEXT | Référence du voyage |
| `point_from` | TEXT | Point de départ du voyage |
| `point_to` | TEXT | Point d'arrivée du voyage |

### Table `dtl_sequences`

| Champ | Type | Description |
|-------|------|-------------|
| `soc_flag` | BOOLEAN | Shipper Owned Container (conteneur client) |
| `is_empty` | BOOLEAN | Conteneur vide en repositionnement |
| `marketing_commodity_l0` | TEXT | Catégorie marchandise niveau 0 (macro) |
| `marketing_commodity_l1` | TEXT | Catégorie marchandise niveau 1 (intermédiaire) |
| `marketing_commodity_l2` | TEXT | Catégorie marchandise niveau 2 (détail) |

---

## 🎯 Questions Métier Supportées

### ✅ Support Complet

1. **Volume TEU par client**
   ```
   "Quel est le volume TEU de Renault depuis le début d'année ?"
   ```

3. **Top N clients**
   ```
   "Top 10 clients par volume dernier trimestre"
   ```

5. **Conteneurs reefers**
   ```
   "Nombre de reefers au départ Shanghai en novembre"
   ```

6. **Marchandises dangereuses**
   ```
   "Répartition des marchandises dangereuses par destination"
   ```

### ⚠️ Support Partiel (Nécessite Développement Additionnel)

2. **Spot vs Long Terme**
   ```
   "Part Spot vs Long Terme sur la trade Asie-Europe"
   ```
   - Champ `contract_type` disponible
   - Nécessite logique de classification (Quarterly/Monthly/Yearly = Long Terme)

4. **Comparaison Year-over-Year**
   ```
   "Clients avec volume en baisse > 20% vs N-1"
   ```
   - Nécessite deux requêtes (année N et N-1)
   - Calcul du delta en pourcentage

---

## 🐛 Troubleshooting

### Migration SQL échoue

**Erreur:** `relation "bookings" does not exist`
- **Solution:** Exécuter d'abord la migration initiale `20250103_create_bookings_tables.sql`

**Erreur:** `column "contract_type" already exists`
- **Solution:** Migration déjà appliquée, vérifier avec `\d bookings` dans psql

### Réingestion échoue

**Erreur:** `SUPABASE_SERVICE_ROLE_KEY manquante`
- **Solution:** Ajouter la clé dans `.env.local` (disponible dans Supabase Settings > API)

**Erreur:** `CSV file not found`
- **Solution:** Vérifier le chemin du fichier `Albert School Sample 20k.csv` à la racine du projet

### Export PDF ne fonctionne pas

**Erreur:** `Cannot find module 'jspdf'`
- **Solution:**
  ```bash
  npm install jspdf jspdf-autotable html2canvas --legacy-peer-deps
  ```

---

## 📚 Documentation Complète

Pour plus de détails, voir:
- `IMPLEMENTATION_SUMMARY.md` - Résumé complet des implémentations
- `supabase/migrations/` - Migrations SQL
- `scripts/` - Scripts d'ingestion et migration
- `components/` - Nouveaux composants React

---

## ✅ Checklist de Vérification

Avant de tester:

- [ ] Migration SQL exécutée avec succès
- [ ] Données CSV réingérées
- [ ] `npm run dev` fonctionne sans erreur
- [ ] Les 6 questions métier du PDF affichées dans l'interface
- [ ] Nouveaux composants importés dans les fichiers appropriés
- [ ] Variables d'environnement configurées

---

**Bonne chance pour le challenge CMA CGM !** 🚢
