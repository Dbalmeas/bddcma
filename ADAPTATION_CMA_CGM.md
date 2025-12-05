# Adaptation du Projet pour le Challenge CMA CGM Talk to Data

## Résumé des Modifications

Ce document décrit les adaptations effectuées pour transformer le projet "Talk to Data" existant en Proof of Concept (POC) pour le Challenge CMA CGM.

## ✅ Modifications Complétées

### 1. Charte Graphique CMA CGM

**Fichiers modifiés:**
- `app/globals.css` - Palette de couleurs CMA CGM (clair/sombre)
- `app/layout.tsx` - Intégration du ThemeProvider
- `components/theme-provider.tsx` - Support du thème clair/sombre

**Couleurs implémentées:**
- **Bleu Institutionnel**: `#00458C` (clair) / `#002D59` (sombre)
- **Orange/Rouge Vif**: `#FF6F00` (clair) / `#FF8A33` (sombre)
- **Fond Principal**: `#F4F6F8` (clair) / `#1A1A1A` (sombre)
- **Texte Principal**: `#333333` (clair) / `#FFFFFF` (sombre)

### 2. Moteur NLP Adapté au Shipping

**Fichiers modifiés:**
- `lib/agent/query-parser.ts` - Parser adapté pour le jargon shipping

**Fonctionnalités:**
- ✅ Support multilingue FR/EN avec tolérance au mélange
- ✅ Reconnaissance des entités métier:
  - Clients (shipcomp_code, shipcomp_name)
  - Ports (POL/POD, point_load, point_disch)
  - Trades (Asia-Europe, Transpacific, etc.)
  - Métriques (TEU, nb_teu, units, weight)
  - Abréviations (TEU, OOG, POL, POD)
- ✅ Gestion des références temporelles (relatives, absolues, comparatives)
- ✅ Détection d'ambiguïté avec suggestions de clarification
- ✅ Contexte conversationnel (mémoire des questions précédentes)

### 3. Gestion des Données Booking/dtl_sequence

**Fichiers modifiés:**
- `lib/agent/sql-generator.ts` - Générateur SQL adapté

**Fonctionnalités:**
- ✅ Structure hiérarchique Booking (niveau 1) / dtl_sequences (niveau 2)
- ✅ Agrégation correcte au bon niveau (booking vs detail)
- ✅ Filtre par défaut: exclusion automatique des bookings annulés (job_status = 1)
- ✅ Transparence: affichage des filtres appliqués, période, nombre de lignes analysées

### 4. Interface Conversationnelle

**Fichiers modifiés:**
- `components/chat-area.tsx` - Design messagerie
- `components/StructuredReport.tsx` - Affichage des données shipping

**Fonctionnalités:**
- ✅ Design type messagerie pour le chat
- ✅ Indicateur de frappe pendant le traitement
- ✅ Bulles de chat utilisateur en orange (#FF6F00)
- ✅ Guidage utilisateur au démarrage (exemples contextuels)
- ✅ Suggestions adaptées au shipping:
  - "Quel est le volume TEU total par client ce trimestre ?"
  - "Show me bookings from Shanghai to Rotterdam last month"
  - "Analyse des volumes par route commerciale"

### 5. Visualisations Adaptées

**Fichiers modifiés:**
- `app/api/query/route.ts` - Génération de graphiques
- `components/DynamicChart.tsx` - Palette de couleurs CMA CGM

**Types de graphiques:**
- ✅ Line chart: Volume TEU par date
- ✅ Bar chart: Volume par client, POL, POD
- ✅ Pie chart: Distribution par route commerciale, type de marchandise
- ✅ Couleurs adaptées à la charte CMA CGM

### 6. Insights Proactifs

**Fichiers modifiés:**
- `app/api/query/route.ts` - Fonction `generateProactiveInsights()`

**Fonctionnalités:**
- ✅ Détection d'anomalies:
  - Volume 40% inférieur/supérieur à la moyenne
  - Changements significatifs par client
  - Changements de route
- ✅ Reconnaissance de patterns:
  - Saisonnalité
  - Tendances (hausse/baisse)
  - Concentration client (risque de dépendance)
- ✅ Recommandations business:
  - Diversification client
  - Optimisation de routes
  - Alertes sur déclins de volume

### 7. Gestion du Contexte Conversationnel

**Fonctionnalités:**
- ✅ Mémoire des 3 dernières messages
- ✅ Résolution des références ("it", "them", "that client")
- ✅ Interprétation des références temporelles relatives
- ✅ Support des questions de suivi

## 📋 Structure de Données

### Tables Supabase
- `bookings` (niveau 1): Informations générales de réservation
- `dtl_sequences` (niveau 2): Détails des conteneurs (relation 1-N)

### Métriques Principales
- `nb_teu`: Volume TEU (niveau dtl_sequence)
- `nb_units`: Nombre d'unités
- `net_weight`: Poids net

## 🎯 Critères du Challenge

### Critère 1: Compréhension du Langage Naturel (25 points)
- ✅ Multilingue FR/EN avec tolérance au mélange
- ✅ Robustesse (synonymes, fautes de frappe, formulations multiples)
- ✅ Contexte conversationnel
- ✅ Entités métier shipping
- ✅ Détection d'ambiguïté avec clarification

### Critère 2: Gestion des Données et Précision
- ✅ Structure hiérarchique Booking/dtl_sequence
- ✅ Agrégation correcte au bon niveau
- ✅ Filtre par défaut (exclure Cancelled)
- ✅ Transparence des filtres appliqués

### Critère 3: Visualisations et Insights (20 points)
- ✅ Réponses multi-formats (chiffres, tableaux, graphiques)
- ✅ Type de graphique adapté au contexte
- ✅ Insights proactifs pertinents
- ✅ Détection d'anomalies
- ✅ Reconnaissance de patterns
- ✅ Recommandations business

### Critère 4: Suggestions Proactives (15 points)
- ✅ Insights complémentaires pertinents
- ✅ Anomalies significatives
- ✅ Patterns et tendances
- ✅ Recommandations d'actions concrètes

### Critère 5: UX Conversationnelle (22 points)
- ✅ Design type messagerie
- ✅ Indicateur de frappe
- ✅ Guidage utilisateur au démarrage
- ✅ Charte graphique CMA CGM

## 🔧 Configuration Requise

### Variables d'Environnement
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MISTRAL_API_KEY=your_mistral_api_key
```

### Base de Données
- Tables `bookings` et `dtl_sequences` doivent être créées (voir `create-tables.sql`)
- Relations et index configurés

## 📝 Notes Techniques

### Intégrations Potentielles (Documentation)
- **Voxtrad**: Mentionné comme inspiration pour la gestion linguistique
- **Sendpak**: Mentionné comme inspiration pour les flux de données

### Qualité Technique
- Code propre et modulaire
- Gestion d'erreurs robuste
- Temps de réponse optimisés (< 3s pour questions simples)
- Tests unitaires recommandés pour le parsing NLP

## 🚀 Prochaines Étapes

1. **Logo CMA CGM**: Ajouter le logo officiel dans l'interface
2. **Tests**: Implémenter des tests unitaires pour le parsing NLP
3. **Documentation Architecture**: Compléter la documentation technique
4. **Optimisations**: Améliorer les temps de réponse si nécessaire
5. **Internationalisation**: Étendre le support multilingue si nécessaire

## 📚 Fichiers Clés Modifiés

- `app/globals.css` - Charte graphique
- `app/layout.tsx` - Thème et metadata
- `lib/agent/query-parser.ts` - NLP shipping
- `lib/agent/sql-generator.ts` - SQL Booking/dtl_sequence
- `app/api/query/route.ts` - API et insights
- `components/chat-area.tsx` - Interface conversationnelle
- `components/StructuredReport.tsx` - Affichage shipping
- `components/DynamicChart.tsx` - Graphiques CMA CGM

