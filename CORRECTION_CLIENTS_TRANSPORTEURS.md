# Correction : Clients vs Transporteurs

## ⚠️ Erreur identifiée

J'avais confondu deux concepts différents dans la base de données :

### Structure correcte :

| Colonne | Signification | Exemples | Nombre |
|---------|---------------|----------|---------|
| **`partner_code` / `partner_name`** | **LES VRAIS CLIENTS** | Décathlon, Agacia Ceylon, Allround Forwarding | ~50,000+ clients uniques |
| **`shipcomp_code` / `shipcomp_name`** | **LES TRANSPORTEURS** | CMA CGM, APL, ANL, CHENG LIE | 4 transporteurs |

### Exemple concret :

```
Booking #JREF_123456:
  - shipcomp_code: 0001 (CMA CGM) ← Le transporteur maritime
  - partner_code: 0002599371 (Décathlon Sports Kenya) ← Le client qui réserve
  - origin: FAR EAST
  - destination: NORTH EUROPE
```

---

## 📊 Données clients dans la base

### Top 20 clients réels (par nombre de bookings) :

| Rang | Client | Bookings | Part |
|------|--------|----------|------|
| 1 | AGACIA CEYLON PVT LTD | 18,038 | 1.5% |
| 2 | ALLROUND FORWARDING MIDWEST | 12,084 | 1.0% |
| 3 | ACE GLOBAL LINES | 9,804 | 0.8% |
| 4 | ATOLL TUNA PVT LTD | 9,516 | 0.8% |
| 5 | AGROPECUARIA LABRUNIER | 7,363 | 0.6% |
| 6 | ACT POLYOLS PVT LTD | 6,641 | 0.6% |
| 7 | AGILITY GLOBAL INTEGRATED LOGISTICS | 6,553 | 0.6% |
| 8 | BLPL SINGAPORE PTE LTD | 6,239 | 0.5% |
| 9 | DELIGHT FOODS LLC | 5,697 | 0.5% |
| 10 | AKWA LOGISTICS GAY OTO | 5,618 | 0.5% |
| ... | ... | ... | ... |

### Exemple Décathlon :

| Entité | Bookings | Période |
|--------|----------|---------|
| Décathlon Sports Kenya | 155 | 2019-2020 |
| Décathlon RDC | 57 | 2019-2020 |
| Décathlon Canada | 3 | 2020 |
| Décathlon (siège) | 4 | 2020 |
| Décathlon Bel Air | 1 | 2020 |
| **TOTAL DÉCATHLON** | **220** | **2019-2020** |

### Transporteurs dans la base :

| Transporteur | Bookings | Part | Période |
|--------------|----------|------|---------|
| CMA CGM (0001) | 871,664 | 73.3% | 2017-2021 |
| APL (0015) | 163,948 | 13.8% | 2018-2020 |
| ANL (0002) | 153,621 | 12.9% | 2019-2020 |
| CHENG LIE (0011) | 4 | 0.0% | 2020 |

---

## 🔧 Corrections apportées

### Migration SQL créée : `20250109_fix_client_vs_shipper.sql`

**Ce qui a été corrigé :**

1. **Vue matérialisée `mv_client_monthly_volumes`** ✅
   - Maintenant utilise `partner_code` (clients)
   - Agrégations mensuelles par VRAI client

2. **Nouvelle vue `mv_shipper_monthly_volumes`** ✅
   - Utilise `shipcomp_code` (transporteurs)
   - Permet d'analyser les volumes par compagnie maritime

3. **Fonction `get_client_volume()`** ✅
   - Maintenant utilise `partner_code`
   - Calcule volumes pour un CLIENT spécifique

4. **Fonction `get_top_clients()`** ✅
   - Maintenant utilise `partner_code`
   - Retourne le top N des CLIENTS

5. **Nouvelles fonctions créées :**
   - `get_shipper_volume()` - Volumes par transporteur
   - `get_top_shippers()` - Top N transporteurs

6. **Index ajoutés :**
   - `idx_bookings_partner_date` - Optimise requêtes par client
   - `idx_bookings_partner_status` - Optimise filtres par statut client

---

## 📝 Comment utiliser les corrections

### Exécuter la migration :

```bash
# Via MCP Supabase (quand le serveur sera de nouveau disponible)
npx supabase migration up

# Ou manuellement
psql < supabase/migrations/20250109_fix_client_vs_shipper.sql
```

### Exemples d'utilisation :

```sql
-- Top 10 CLIENTS (vrais clients) sur l'année 2020
SELECT * FROM get_top_clients(10, '2020-01-01', '2020-12-31');

-- Volume pour Décathlon Kenya en 2020
SELECT * FROM get_client_volume('0002599371', '2020-01-01', '2020-12-31');

-- Top transporteurs (compagnies maritimes)
SELECT * FROM get_top_shippers(10, '2020-01-01', '2020-12-31');

-- Volume CMA CGM en 2020
SELECT * FROM get_shipper_volume('0001', '2020-01-01', '2020-12-31');

-- Volumes mensuels clients (vue matérialisée rapide)
SELECT * FROM mv_client_monthly_volumes 
WHERE partner_code = '0002599371' -- Décathlon Kenya
  AND month >= '2020-01-01'
ORDER BY month;

-- Volumes mensuels transporteurs
SELECT * FROM mv_shipper_monthly_volumes
WHERE shipcomp_code = '0001' -- CMA CGM
  AND month >= '2020-01-01'
ORDER BY month;
```

---

## ✅ Résumé

| Avant (incorrect) | Après (correct) |
|-------------------|-----------------|
| `get_top_clients()` retournait les transporteurs | Retourne les vrais clients (partners) |
| `mv_client_monthly_volumes` utilisait `shipcomp_code` | Utilise `partner_code` |
| Confusion entre clients et transporteurs | Distinction claire |
| Seulement 4 "clients" | ~50,000+ vrais clients |

**La migration est prête à être appliquée dès que le serveur Supabase sera de nouveau disponible.**

---

## 🎯 Questions métier supportées

Avec ces corrections, vous pouvez maintenant répondre à :

1. **Top clients par volume** ✅ `get_top_clients()`
2. **Volume d'un client spécifique** ✅ `get_client_volume()`
3. **Évolution mensuelle d'un client** ✅ `mv_client_monthly_volumes`
4. **Part de marché par transporteur** ✅ `get_top_shippers()`
5. **Volume par compagnie maritime** ✅ `get_shipper_volume()`
6. **Analyse par client ET transporteur** ✅ Jointure sur les deux colonnes
