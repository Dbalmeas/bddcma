# 🚀 Guide de Démarrage Rapide - Projet Everdian x Albert School

## Objectif du projet

Créer un **agent IA capable de générer des graphiques et d'analyser la base de données SANS hallucination** en utilisant :
- 4M+ événements provenant de sources Everdian (news + social media)
- Requêtes en langage naturel
- Supabase comme backend
- Next.js + React pour le frontend

---

## ✅ Ce qui a été fait

### 1. Configuration Supabase
- ✅ Client Supabase installé et configuré
- ✅ Variables d'environnement dans `.env.local`
- ✅ Schéma SQL complet (6 tables + indexes + full-text search)
- ✅ Page de test : http://localhost:3000/test-db

### 2. Scripts d'ingestion
- ✅ Script pour importer les fichiers JSONL
- ✅ Batch processing optimisé (500 événements par batch)
- ✅ Transformation automatique des données
- ✅ Gestion d'erreurs et statistiques en temps réel

---

## 📋 Étapes pour lancer le projet

### Étape 1 : Exécuter le schéma SQL ⚠️ OBLIGATOIRE

1. Ouvrez votre dashboard Supabase : https://fhwflhowbhqkheeqpxqh.supabase.co
2. Cliquez sur **SQL Editor** (barre latérale gauche)
3. Copiez le contenu de `supabase/schema.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur **Run** (bouton vert en haut à droite)

Cela va créer :
- 6 tables (events, event_labels, event_locations, event_media, event_users, user_metrics)
- 17 indexes pour la performance
- Full-text search
- 3 fonctions utilitaires
- 1 vue complète

### Étape 2 : Tester la connexion

```bash
# Le serveur dev est déjà lancé sur http://localhost:3000

# Ouvrir dans le navigateur :
http://localhost:3000/test-db
```

Cliquez sur **"Check Tables"** pour vérifier que les 6 tables existent.

### Étape 3 : Ingérer les données (TEST)

Commencez par un **petit fichier** pour tester :

```bash
npm run ingest -- "/Users/alexismeniante/Desktop/BDD Everdian x Albert School/2025-09-09.jsonl"
```

Attendez la fin (quelques secondes), puis retournez sur `/test-db` et cliquez sur **"Get Events Count"**.

Si le compteur affiche un nombre > 0, **c'est que ça marche !** 🎉

### Étape 4 : Ingérer TOUTES les données (OPTIONNEL)

**⚠️ Cela va prendre 1-2 heures pour traiter 4M+ événements**

```bash
npm run ingest:all
```

Vous pouvez suivre la progression dans le terminal.

**Alternative rapide** : Importez seulement quelques fichiers pour avoir assez de données de test :

```bash
# Importer 3-4 fichiers variés (petit + moyen + gros)
npm run ingest -- "/Users/alexismeniante/Desktop/BDD Everdian x Albert School/2025-08-08.jsonl"
npm run ingest -- "/Users/alexismeniante/Desktop/BDD Everdian x Albert School/2025-08-14.jsonl"
npm run ingest -- "/Users/alexismeniante/Desktop/BDD Everdian x Albert School/2025-09-20.jsonl"
```

Cela vous donnera ~500,000 événements pour tester l'agent IA.

---

## 🎯 Prochaines étapes

Une fois les données importées, nous allons créer :

### 1. Agent IA (Query Parser)
- Parser les requêtes en langage naturel
- Générer du SQL sécurisé
- Interroger Supabase
- **Système anti-hallucination** avec validation des données

### 2. Génération de graphiques
- Détection automatique du type de graphique (ligne, barre, carte, tableau)
- Agrégation des données
- Visualisation avec Recharts

### 3. Interface conversationnelle
- Chat interactif
- Historique des conversations
- Export des résultats (JSON, CSV, Excel)

---

## 📂 Structure du projet

```
frontEverdian/
├── .env.local                    # Credentials Supabase
├── lib/
│   └── supabase.ts              # Client Supabase + types
├── supabase/
│   └── schema.sql               # Schéma complet de la BDD
├── scripts/
│   ├── ingest-data.ts           # Script d'ingestion principal
│   ├── ingest-all.ts            # Ingestion de tous les fichiers
│   └── README.md                # Documentation des scripts
├── app/
│   ├── page.tsx                 # Page d'accueil (chat)
│   └── test-db/
│       └── page.tsx             # Page de test de connexion
└── components/
    ├── chat-area.tsx            # Zone de chat (à améliorer)
    ├── chat-sidebar.tsx         # Historique des conversations
    └── visualizations/          # (à créer) Composants de graphiques
```

---

## 🧪 Tests disponibles

### Test 1 : Connexion Supabase
```
http://localhost:3000/test-db
```
Vérifie que la connexion fonctionne et que les tables existent.

### Test 2 : Requête SQL directe
Dans l'éditeur SQL de Supabase :
```sql
SELECT COUNT(*) FROM events;
```

### Test 3 : Recherche full-text
```sql
SELECT * FROM search_events('explosion Paris', 10);
```

### Test 4 : Filtrage par pays
```sql
SELECT * FROM events_by_country('France', 10);
```

### Test 5 : Vue complète
```sql
SELECT * FROM events_complete LIMIT 10;
```

---

## 📊 Données disponibles

### Volume total
- **56 fichiers JSONL**
- **4M+ événements** (2.2 GB)
- Dates : 6 août 2025 → 27 octobre 2025

### Types d'événements
- News (articles de presse)
- Social media (Twitter/X)
- 200+ langues
- Géolocalisation mondiale

### Métadonnées
- Labels IA (Event Temporality, Main Categories, Impact, etc.)
- Géolocalisation (mentions + inférées)
- Médias (images, vidéos)
- Métriques utilisateurs

---

## 🔧 Commandes utiles

```bash
# Lancer le serveur de développement
npm run dev

# Ingérer un fichier JSONL
npm run ingest -- "<chemin-vers-fichier>"

# Ingérer tous les fichiers
npm run ingest:all

# Build production
npm run build

# Lancer en production
npm run start
```

---

## 🆘 Dépannage

### Le serveur ne démarre pas
```bash
# Arrêter tous les processus Node
killall node

# Relancer
npm run dev
```

### Erreur "relation does not exist"
→ Vous devez exécuter `supabase/schema.sql` dans l'éditeur SQL de Supabase

### L'ingestion est lente
→ C'est normal ! Les gros fichiers (50-180 MB) prennent 10-30 minutes chacun

### Comment voir les logs d'ingestion ?
→ Tout s'affiche dans le terminal où vous avez lancé `npm run ingest`

---

## 💡 Exemples de requêtes utilisateur (pour l'agent IA)

Une fois l'agent développé, les utilisateurs pourront poser des questions comme :

- "Donne-moi un rapport global sur la situation à Gaza aujourd'hui"
- "Je veux un tableau des accidents de la route à Saint-Étienne hier"
- "Montre-moi un graphique de l'évolution des cyberattaques en France cette semaine"
- "Identifie les principales narratives autour du déploiement de la garde nationale à Memphis"
- "Récupère-moi les contenus les plus révélateurs de la situation à Marseille cette dernière semaine"

---

## 📚 Documentation

- **Supabase** : https://supabase.com/docs
- **Next.js** : https://nextjs.org/docs
- **Recharts** : https://recharts.org/
- **Scripts d'ingestion** : `scripts/README.md`
- **Setup Supabase** : `SETUP_SUPABASE.md`

---

## ✨ Résumé en 3 étapes

1. **Exécuter le schema.sql** dans Supabase SQL Editor
2. **Tester** : `npm run ingest -- "<petit-fichier.jsonl>"`
3. **Vérifier** : http://localhost:3000/test-db → "Get Events Count"

Si vous voyez un nombre > 0, vous êtes prêt à développer l'agent IA ! 🚀
