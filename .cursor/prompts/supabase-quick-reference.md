# Référence Rapide - Base Supabase CMA CGM

## 🏗️ Structure en 30 secondes

```
BOOKINGS (1.2M) ──1:N──> DTL_SEQUENCES (1.3M)
   booking              conteneurs
```

## 📊 Tables principales

### `bookings` - Réservations
**Clé** : `job_reference`  
**Important** :
- `partner_code/name` = **CLIENT** (ex: Décathlon)
- `shipcomp_code/name` = **TRANSPORTEUR** (CMA CGM, APL, ANL)
- `job_status != 9` pour exclure les annulés

### `dtl_sequences` - Conteneurs
**Clé** : `(job_reference, job_dtl_sequence)`  
**Important** :
- `teus_booked` = volume en TEU
- `reef_flag` = conteneur réfrigéré
- `haz_flag` = marchandise dangereuse

## 🔥 Fonctions rapides

```sql
-- Top 10 clients
SELECT * FROM get_top_clients(10, '2020-01-01', '2020-12-31');

-- Volume client
SELECT * FROM get_client_volume('0002599371', '2020-01-01', '2020-12-31');

-- Top transporteurs
SELECT * FROM get_top_shippers(10);
```

## 📈 Vues matérialisées (ultra-rapide)

```sql
-- Volumes mensuels par client
SELECT * FROM mv_client_monthly_volumes 
WHERE partner_code = '0002599371' AND month >= '2020-01-01';

-- Volumes mensuels par transporteur
SELECT * FROM mv_shipper_monthly_volumes 
WHERE month >= '2020-01-01';

-- Volumes par port
SELECT * FROM mv_port_volumes 
WHERE port_country = 'CN';
```

## 💡 Pattern de base

```sql
-- Exemple: Top clients sur routes depuis Chine vers UAE
SELECT
  b.partner_name,
  b.point_load_country,
  b.point_disch_country,
  SUM(d.teus_booked) as total_teu,
  COUNT(DISTINCT b.job_reference) as bookings
FROM bookings b
JOIN dtl_sequences d ON b.job_reference = d.job_reference
WHERE b.job_status != 9  -- Exclure annulés
  AND b.booking_confirmation_date >= '2020-01-01'
  AND b.booking_confirmation_date < '2020-07-01'
  AND b.point_load_country = 'CN'  -- Chine (59% des données)
GROUP BY b.partner_name, b.point_load_country, b.point_disch_country
ORDER BY total_teu DESC
LIMIT 10;
```

## ⚠️ À retenir

1. **Client ≠ Transporteur**
   - Client = `partner_*` (qui paie)
   - Transporteur = `shipcomp_*` (qui transporte)

2. **Toujours filtrer** : `job_status != 9`

3. **Toujours joindre** pour avoir les volumes :
   ```sql
   JOIN dtl_sequences d ON b.job_reference = d.job_reference
   ```

4. **Utiliser les vues matérialisées** pour agrégations mensuelles

5. **Période disponible** :
   - **Données principales** : 2020-01-01 à 2020-06-30 (6 mois, ~1.065M bookings)
   - **Données historiques** : 2019-01-01 à 2019-12-31 (1 an, ~123K bookings)
   - **Total utilisable** : 18 mois (2019-2020)

## 🎯 Questions métier supportées

✅ Top clients par volume
✅ Spot vs Long Terme
✅ Reefers par port
✅ Routes Asie → Moyen-Orient/Inde (dominantes)
✅ Évolution temporelle (2019 + Jan-Jun 2020)
✅ Part de marché transporteurs
✅ Analyse des ports chinois (Ningbo, Shanghai, Qingdao)
✅ Flux vers UAE, Inde, Égypte  

## 📚 Documentation complète

Voir : `.cursor/prompts/supabase-database-structure.md`
