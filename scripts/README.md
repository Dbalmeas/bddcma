# 📊 Scripts d'ingestion de données

## Vue d'ensemble

Ces scripts permettent d'importer les fichiers JSONL d'Everdian dans la base de données Supabase.

## Prérequis

1. ✅ Avoir exécuté le schéma SQL dans Supabase (`supabase/schema.sql`)
2. ✅ Avoir configuré `.env.local` avec vos credentials Supabase
3. ✅ Avoir installé les dépendances : `npm install`

## Fichiers

- **`ingest-data.ts`** : Script principal d'ingestion d'un fichier JSONL
- **`ingest-all.ts`** : Script pour ingérer tous les fichiers d'un répertoire

## 🚀 Utilisation

### Option 1 : Ingérer un seul fichier (RECOMMANDÉ POUR TESTER)

```bash
npm run ingest -- "/Users/alexismeniante/Desktop/BDD Everdian x Albert School/2025-08-08.jsonl"
```

**Avantages** :
- Parfait pour tester sur un petit fichier
- Feedback immédiat
- Facile à débugger

### Option 2 : Ingérer tous les fichiers (ATTENTION : LONG)

```bash
npm run ingest:all
```

**Note** : Cela va traiter les 56 fichiers (~2.2 GB). **Temps estimé : 1-2 heures**

### Option 3 : Personnaliser le répertoire

```bash
DATA_DIR="/path/to/your/data" npm run ingest:all
```

## 📈 Fonctionnement

Le script fait les opérations suivantes pour chaque événement :

1. **Parse** le JSON depuis le fichier JSONL
2. **Transforme** les données au format Supabase :
   - Event principal → table `events`
   - Labels IA → table `event_labels`
   - Localisations → table `event_locations`
   - Médias (images/vidéos) → table `event_media`
   - Utilisateurs → table `event_users`
   - Métriques → table `user_metrics`
3. **Insère par batch** de 500 événements pour optimiser les performances
4. **Affiche la progression** en temps réel

## 🎯 Performance

- **Vitesse moyenne** : 100-200 événements/seconde
- **Batch size** : 500 événements par insertion
- **Gestion d'erreurs** : Continue même en cas d'erreur sur un événement

### Exemple de sortie

```
🚀 Démarrage de l'ingestion des données...

📊 Configuration:
   - Supabase URL: https://fhwflhowbhqkheeqpxqh.supabase.co
   - Batch size: 500

✅ Connexion Supabase OK

📂 Traitement de 2025-08-08.jsonl...
  ✓ 500 événements | 150/s | 3.3s
  ✓ 1,000 événements | 155/s | 6.5s
  ✓ 1,500 événements | 152/s | 9.9s
  ✅ 2025-08-08.jsonl terminé (1,842 lignes)

============================================================
📊 STATISTIQUES FINALES
============================================================
✅ Événements traités: 1,842
⏭️  Événements ignorés: 0
❌ Erreurs: 0
⏱️  Durée totale: 12.1s
📈 Vitesse moyenne: 152 événements/s
============================================================
```

## 🧪 Test rapide

Pour tester que tout fonctionne, commencez par un petit fichier :

```bash
# 1. Tester sur le plus petit fichier (2025-09-09.jsonl = 4KB)
npm run ingest -- "/Users/alexismeniante/Desktop/BDD Everdian x Albert School/2025-09-09.jsonl"

# 2. Vérifier dans la page de test
# Ouvrir http://localhost:3000/test-db
# Cliquer sur "Get Events Count"
```

Si le compteur affiche un nombre > 0, c'est que ça marche ! 🎉

## 🔧 Dépannage

### Erreur "relation does not exist"
→ Vous devez d'abord exécuter `supabase/schema.sql` dans l'éditeur SQL de Supabase

### Erreur "Missing environment variables"
→ Vérifiez que `.env.local` contient bien vos credentials Supabase

### Erreur "duplicate key value"
→ C'est normal ! Le script ignore automatiquement les doublons (upsert)

### Le script est très lent
→ Normal avec les gros fichiers (50-180 MB). Comptez 5-10 minutes par gros fichier.

### Comment arrêter l'ingestion ?
→ Appuyez sur `Ctrl+C`. Les données déjà insérées resteront en base.

## 📊 Estimation pour l'ingestion complète

Avec 4M+ événements répartis sur 56 fichiers :

| Fichier | Taille | Temps estimé | Événements |
|---------|--------|--------------|------------|
| Petits (< 1 MB) | 300 KB | ~30s | ~2,000 |
| Moyens (1-50 MB) | 12-50 MB | ~5-10 min | ~50,000-250,000 |
| Gros (> 50 MB) | 50-180 MB | ~10-30 min | ~250,000-900,000 |

**Durée totale estimée** : 1-2 heures pour tout importer

## 💡 Conseils

1. **Commencez par un petit fichier** pour tester
2. **Lancez l'ingestion complète en arrière-plan** (terminal dédié)
3. **Surveillez les logs** pour détecter d'éventuelles erreurs
4. **Vérifiez régulièrement** le nombre d'événements sur `/test-db`

## 🎯 Prochaines étapes

Une fois l'ingestion terminée :

1. ✅ Vérifier le nombre total d'événements dans Supabase
2. ✅ Tester les requêtes SQL (fonctions `search_events`, etc.)
3. ✅ Développer l'agent IA pour interroger la base
4. ✅ Créer les visualisations automatiques

## 📝 Structure des données

Chaque événement JSONL est décomposé en :

```typescript
// 1 event → multiple insertions
{
  events: 1 row,           // Table principale
  event_labels: 0-10 rows, // Labels IA (Event Temporality, Main Categories, etc.)
  event_locations: 0-5 rows, // Géolocalisation (mentions + inférées)
  event_media: 0-10 rows,  // Images et vidéos
  event_users: 0-1 row,    // Auteur du post
  user_metrics: 0-5 rows   // Métriques (followers, rank, etc.)
}
```

## ⚙️ Configuration avancée

### Changer la taille des batchs

Éditez `scripts/ingest-data.ts` :

```typescript
const BATCH_SIZE = 500 // Augmentez pour plus de vitesse, diminuez si erreurs
```

### Paralléliser l'ingestion

Pour aller plus vite, vous pouvez lancer plusieurs scripts en parallèle :

```bash
# Terminal 1
npm run ingest -- "path/to/file1.jsonl"

# Terminal 2
npm run ingest -- "path/to/file2.jsonl"

# etc.
```

**Attention** : Ne pas dépasser 3-4 processus en parallèle pour éviter de surcharger Supabase.
