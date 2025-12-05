# Configuration Supabase - Projet Everdian x Albert School

## ✅ Étapes complétées

1. ✅ Installation de `@supabase/supabase-js`
2. ✅ Configuration des variables d'environnement dans `.env.local`
3. ✅ Création du client Supabase dans `lib/supabase.ts`
4. ✅ Création du schéma SQL complet dans `supabase/schema.sql`
5. ✅ Création d'une page de test à `/test-db`

## 🚀 Prochaines étapes

### 1. Exécuter le schéma SQL dans Supabase

1. Ouvrez votre dashboard Supabase : https://fhwflhowbhqkheeqpxqh.supabase.co
2. Allez dans **SQL Editor** (dans la barre latérale gauche)
3. Copiez le contenu du fichier `supabase/schema.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur **Run** pour exécuter le script

Cela va créer :
- ✅ 6 tables principales (events, event_labels, event_locations, event_media, event_users, user_metrics)
- ✅ Tous les indexes pour la performance
- ✅ Le système de recherche full-text
- ✅ Des fonctions utilitaires pour les requêtes

### 2. Tester la connexion

```bash
npm run dev
```

Puis ouvrez dans votre navigateur :
```
http://localhost:3000/test-db
```

Cette page vous permet de :
- Tester la connexion à Supabase
- Vérifier que toutes les tables existent
- Voir le nombre d'événements dans la base (une fois importés)

### 3. Importer les données JSONL

Une fois le schéma créé et testé, nous allons créer un script d'ingestion pour importer les 4M+ événements depuis les fichiers JSONL.

## 📋 Structure de la base de données

### Table `events` (principale)
- `id`: Identifiant unique de l'événement
- `text`: Texte original
- `english_sentence`: Traduction anglaise
- `lang`: Code de langue (ex: "eng_Latn")
- `publish_date`: Date de publication
- `network`: Source (news/twitter)
- `url`: Lien vers l'événement

### Table `event_labels`
Labels AI pour classifier les événements :
- Event Temporality (Active/Past/Future)
- Main Categories (Airplane Accident, Fire, etc.)
- Impact (Dead People, Injured, etc.)
- Statement Type (Fact, Opinion, Information)
- Content Type (Event alert, Analysis, etc.)

### Table `event_locations`
Géolocalisation avec 3 types :
- `mention`: Lieux mentionnés dans le texte
- `inferred`: Lieux inférés par l'IA
- `post`: Lieu de publication
- Coordonnées GPS (latitude/longitude)

### Tables `event_media`, `event_users`, `user_metrics`
Médias, auteurs et métriques associés aux événements

## 🔍 Fonctionnalités disponibles

### Recherche full-text
```typescript
const { data } = await supabase.rpc('search_events', {
  search_query: 'explosion Paris',
  max_results: 100
})
```

### Filtrage par pays
```typescript
const { data } = await supabase.rpc('events_by_country', {
  country_name: 'France',
  max_results: 100
})
```

### Filtrage par label
```typescript
const { data } = await supabase.rpc('events_by_label', {
  label_type: 'Main Categories',
  label_value: 'Fire Incident',
  max_results: 100
})
```

## 📊 Vue complète

Une vue `events_complete` est disponible qui joint automatiquement toutes les tables :

```typescript
const { data } = await supabase
  .from('events_complete')
  .select('*')
  .limit(10)
```

## 🐛 Dépannage

### Erreur "relation does not exist"
→ Vous devez d'abord exécuter le fichier `schema.sql` dans l'éditeur SQL de Supabase

### Erreur "Missing environment variables"
→ Vérifiez que `.env.local` contient bien :
```
NEXT_PUBLIC_SUPABASE_URL=https://fhwflhowbhqkheeqpxqh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Le serveur ne démarre pas
→ Essayez de redémarrer après avoir créé `.env.local` :
```bash
npm run dev
```

## 📝 Notes importantes

- Les variables d'environnement doivent commencer par `NEXT_PUBLIC_` pour être accessibles côté client
- Le fichier `.env.local` est ignoré par Git (sécurité)
- La connexion utilise la clé ANON (publique), les données sont en lecture/écriture libre pour l'instant
- Row Level Security (RLS) est désactivé pour simplifier le développement

## 🎯 Objectif final

Créer un agent IA capable de :
1. Recevoir des requêtes en langage naturel
2. Interroger la base de données Supabase
3. Générer des graphiques et analyses
4. **Sans aucune hallucination** (validation des données)

Exemples de requêtes :
- "Donne-moi un rapport global sur la situation à Gaza aujourd'hui"
- "Je veux un tableau des accidents de la route à Saint-Étienne hier"
- "Identifie les principales narratives autour du déploiement de la garde nationale à Memphis"
