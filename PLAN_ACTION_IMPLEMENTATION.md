# Plan d'Action - Implémentation Complète

Date: 25 novembre 2025

## 🎯 Objectif
Transformer l'application d'un simple chat en une plateforme complète d'analyse d'événements pour Non-Technical Users ET Power Users.

---

## 📋 Phase 1 - Corrections Bugs Visuels (30min)

### Étape 1.1 - Audit des composants
- [x] Lire chat-area.tsx
- [x] Lire chat-sidebar.tsx
- [ ] Lire chat-header.tsx
- [ ] Identifier boutons dupliqués
- [ ] Identifier problèmes de z-index

### Étape 1.2 - Corrections
- [ ] Supprimer boutons dupliqués
- [ ] Fixer superpositions de couleurs
- [ ] Améliorer contraste
- [ ] Rendre fonctionnels les navigation items

**Livrable:** Interface propre sans bugs visuels

---

## 📊 Phase 2 - Tableau de Données Brutes (1h30)

### Étape 2.1 - Créer DataTable Component
**Fichier:** `components/DataTable.tsx`

**Features:**
- Tableau avec colonnes: Date, Titre, Type, Pays, Réseau
- Pagination (50 events par page)
- Tri par colonne cliquable
- Export CSV du tableau
- Responsive design

### Étape 2.2 - Intégrer dans ChatArea
- Toggle "Show raw data" sous chaque réponse
- Afficher le tableau quand toggle activé
- Passer les rawData de l'API au composant

**Livrable:** Power users peuvent voir les données brutes en tableau

---

## 📄 Phase 3 - Rapports Structurés (2h)

### Étape 3.1 - Créer StructuredReport Component
**Fichier:** `components/StructuredReport.tsx`

**Sections:**
1. Executive Summary (texte LLM)
2. Key Statistics (cards avec chiffres clés)
3. Trends (timeline chart)
4. Geographic Distribution (bar chart par pays)
5. Event Types Distribution (pie chart)
6. Notable Events (top 5 avec détails)
7. Raw Data Access (bouton vers tableau)

### Étape 3.2 - Remplacer affichage texte simple
- Détecter si réponse est analytique
- Afficher StructuredReport au lieu de simple texte
- Garder texte simple pour requêtes search

**Livrable:** Non-technical users ont des rapports professionnels

---

## 🔍 Phase 4 - Filtres Avancés (1h30)

### Étape 4.1 - Créer AdvancedFilters Component
**Fichier:** `components/AdvancedFilters.tsx`

**Elements:**
- Date range picker (react-day-picker)
- Multi-select pays (combobox)
- Multi-select event types (checkboxes)
- Keywords input (tags)
- Network filter (radio buttons)
- Apply/Clear buttons

### Étape 4.2 - Intégrer dans Sidebar
- Bouton "Filters" ouvre dialog
- State management des filtres
- Envoyer filtres à l'API query
- Afficher filtres actifs

**Livrable:** Filtres avancés fonctionnels

---

## ⚡ Phase 5 - Mode Power User (1h)

### Étape 5.1 - Toggle Power User
- Ajouter toggle dans header
- State global (context ou zustand)
- Persister dans localStorage

### Étape 5.2 - Features Power User
Quand activé:
- Afficher SQL query générée
- Afficher metadata (query time, tokens)
- Toggle "Raw data" activé par défaut
- Exports formats avancés (Parquet, JSON Lines)

**Livrable:** Power users ont accès complet aux données

---

## 🎨 Phase 6 - Templates & Patterns (1h)

### Étape 6.1 - Query Templates
**Fichier:** `components/QueryTemplates.tsx`

**Catégories:**
- Security (Cyberattacks, Incidents)
- Accidents (Aviation, Road, Railway)
- Crime (Illicit, Arrests)
- Geopolitics (Gaza, Ukraine, France)
- Custom (saved by user)

### Étape 6.2 - Pattern Detection (optionnel)
- Trending topics
- Anomaly detection
- Temporal correlations

**Livrable:** Templates de requêtes prêts à l'emploi

---

## ✅ Checklist de Validation

### Bugs Corrigés
- [ ] Aucun bouton dupliqué
- [ ] Aucune superposition de couleurs
- [ ] Tous les boutons fonctionnent
- [ ] Interface propre et claire

### Fonctionnalités Non-Technical Users
- [ ] Rapports structurés avec sections
- [ ] Graphiques clairs et lisibles
- [ ] Statistiques en cards visuelles
- [ ] Export PDF des rapports
- [ ] Interface intuitive

### Fonctionnalités Power Users
- [ ] Tableau de données brutes complet
- [ ] Filtres avancés UI
- [ ] Toggle Power User mode
- [ ] SQL query visible
- [ ] Metadata visible
- [ ] Exports multiples formats

### UX/UI
- [ ] Loading states clairs
- [ ] Error handling gracieux
- [ ] Responsive design
- [ ] Accessibilité (a11y)
- [ ] Performance (< 3s response time)

---

## 🚀 Ordre d'Exécution

**Maintenant → 30min:**
1. Phase 1 - Corrections bugs visuels

**Après → 1h30:**
2. Phase 2 - DataTable component

**Après → 2h:**
3. Phase 3 - StructuredReport component

**Après → 1h30:**
4. Phase 4 - AdvancedFilters component

**Après → 1h:**
5. Phase 5 - Power User mode

**Après → 1h:**
6. Phase 6 - Templates (si temps)

**Total: 7h30 (sans Phase 6: 6h30)**

---

## 📝 Notes d'Implémentation

### Libraries nécessaires
- `@tanstack/react-table` - Pour DataTable
- `react-day-picker` - Pour date range picker
- `recharts` - Déjà installé pour charts
- `jsPDF` ou `react-pdf` - Pour export PDF

### State Management
- Utiliser Context API pour Power User mode
- Utiliser useState local pour filtres
- Persister dans localStorage

### API Changes
- Aucun changement backend nécessaire
- API query déjà support tous les filtres
- Juste améliorer la présentation frontend

---

## 🎬 Démarrage Immédiat

**Je commence maintenant par:**
✅ Phase 1 - Audit et correction des bugs visuels

Temps estimé: 30 minutes
