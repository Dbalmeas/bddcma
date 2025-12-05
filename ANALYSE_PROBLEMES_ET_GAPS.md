# Analyse des Problèmes et Fonctionnalités Manquantes

Date: 25 novembre 2025

## 🐛 Problèmes Visuels Identifiés

### 1. Boutons qui se répètent/superposent
**Localisation probable**: `components/chat-area.tsx` et `components/chat-sidebar.tsx`
- Peut-être des boutons dupliqués dans le code
- Problèmes de z-index ou position absolute qui se chevauchent

### 2. Superpositions de couleurs
**Localisation**: Styles CSS des composants
- Possiblement des backgrounds qui se superposent
- Problèmes d'opacité ou de blend-mode

### 3. Boutons qui ne fonctionnent pas
**À vérifier**:
- Navigation items dans sidebar (History, Filters, Templates, Export)
- Autres boutons d'action

---

## 📊 GAP Analysis - Fonctionnalités Manquantes

### Objectifs du Projet (Rappel)
**Permettre aux utilisateurs d'explorer et interagir avec la base de données d'événements via des requêtes conversationnelles simples.**

### Fonctionnalités Attendues vs Implémentées

| Fonctionnalité | Statut | Priorité | Notes |
|---|---|---|---|
| **Requêtes en langage naturel** | ✅ Implémenté | ✅ | Via `/api/query` |
| **Statistiques agrégées** | ⚠️ Partiel | 🔴 Haute | Existe dans l'API mais pas bien affiché dans le frontend |
| **Visualisations (graphiques)** | ⚠️ Partiel | 🔴 Haute | Charts existent mais limités |
| **Visualisations (tableaux)** | ❌ Manquant | 🔴 Haute | **Pas de tableau de données brutes** |
| **Rapports situationnels** | ❌ Manquant | 🔴 Haute | Actuellement juste du texte |
| **Framing des événements** | ❌ Manquant | 🟡 Moyenne | Comment les événements sont discutés |
| **Localisation rapide** | ⚠️ Partiel | 🟡 Moyenne | Search existe mais pas optimisé |
| **Détection de patterns** | ❌ Manquant | 🟡 Moyenne | Patterns récurrents non détectés |
| **Outils externes** | ❌ Manquant | 🟢 Basse | Pas de connexion externe |

---

## 👥 User Personas - Besoins Non Couverts

### 1. Non-Technical Users
**Ce qu'ils veulent:**
- ✅ Requêtes en langage naturel → **OK**
- ⚠️ Rapports pré-digérés → **Partiel** (actuellement juste du texte)
- ❌ Tableaux formatés → **Manquant**
- ⚠️ Graphiques clairs → **Partiel** (limité)
- ❌ Exports PDF → **Manquant**

**Gap principal:** Interface trop technique, pas assez "report-like"

### 2. Power Users
**Ce qu'ils veulent:**
- ❌ Accès données brutes → **Manquant** (pas de tableau de données)
- ❌ Filtres étendus → **Manquant** (pas de UI pour filtres avancés)
- ⚠️ Requêtes complexes → **Partiel** (parser OK mais pas de UI)
- ❌ Opérations complexes → **Manquant** (pas de SQL builder)
- ❌ Questionnement des données → **Manquant** (pas de meta-analysis)

**Gap principal:** Aucune fonctionnalité power user implémentée

---

## 🎯 Fonctionnalités Critiques à Implémenter

### Priorité 1 - URGENT

#### 1.1 Tableau de Données Brutes
**Composant:** `components/DataTable.tsx` (à créer)

**Specs:**
- Afficher les événements en format tableau
- Colonnes: Date, Titre, Type, Pays, Réseau, Lien
- Pagination (50 events par page)
- Tri par colonne
- Toggle "Show raw data" sous chaque réponse
- Export CSV/JSON du tableau

**Impact:** Power users et non-technical users

#### 1.2 Rapports Structurés
**Composant:** `components/StructuredReport.tsx` (à créer)

**Specs:**
```markdown
## Résumé Exécutif
[Texte généré par LLM - 2-3 paragraphes]

## Statistiques Clés
- Total événements: 1,234
- Période: 1er août - 31 août 2025
- Pays principaux: France (45%), Israël (23%), ...
- Types principaux: Cyberattack (67%), Security Incident (18%), ...

## Tendances
[Graphique timeline]

## Répartition Géographique
[Graphique par pays]

## Distribution par Type
[Graphique pie chart]

## Événements Notables
[Top 5 events avec détails]

## Données Brutes
[Tableau cliquable pour voir tous les events]
```

**Impact:** Non-technical users

#### 1.3 Filtres Avancés UI
**Composant:** `components/AdvancedFilters.tsx` (à créer)

**Specs:**
- Date range picker (calendar)
- Multi-select pays (autocomplete)
- Multi-select types d'événements (checkboxes)
- Keywords search (tags input)
- Labels filters (multi-select)
- Network filter (Twitter/News)
- "Apply Filters" button
- "Clear All" button
- Saved filters (presets)

**Impact:** Power users et non-technical users

### Priorité 2 - IMPORTANT

#### 2.1 Mode Power User
**Toggle dans header:** "Power User Mode"

**Quand activé:**
- Affiche SQL query générée
- Affiche données brutes par défaut
- Montre metadata (query time, tokens used, etc.)
- Accès à query builder avancé
- Export formats supplémentaires (Parquet, SQL dump)

#### 2.2 Détection de Patterns
**Composant:** `components/PatternDetection.tsx`

**Specs:**
- Analyse automatique des patterns récurrents
- "Trending Topics" dans les événements
- Alertes sur anomalies (spike events)
- Corrélations temporelles/géographiques

#### 2.3 Templates de Requêtes
**Composant:** `components/QueryTemplates.tsx`

**Catégories:**
- Sécurité (cyberattacks, incidents)
- Accidents (aérien, routier, ferroviaire)
- Criminalité (illicite, arrestations)
- Géopolitique (Gaza, Ukraine, etc.)
- Personnalisés (saved by user)

### Priorité 3 - NICE TO HAVE

#### 3.1 Intégration Outils Externes
- Export to Google Sheets
- Send to Slack
- Generate Notion page
- Email report

#### 3.2 Collaborative Features
- Partager requêtes avec équipe
- Annotations sur événements
- Workspace partagé

---

## 🔧 Correctifs Techniques Nécessaires

### Backend
- ✅ API fonctionne bien
- ⚠️ Validation disabled (peut causer problèmes)
- ⚠️ Pas de rate limiting
- ❌ Pas de caching des requêtes fréquentes

### Frontend
- ⚠️ Chat area surcharge visuellement
- ❌ Pas de loading states clairs
- ❌ Pas de error boundaries
- ❌ Pas de offline mode

### Design
- ❌ Trop "chat-like", pas assez "report-like"
- ❌ Couleurs pas assez différenciées
- ❌ Buttons trop petits pour actions critiques
- ❌ Pas de onboarding

---

## 📋 Plan d'Action Proposé

### Phase 1 - Correction des Bugs (1-2h)
1. ✅ Identifier et supprimer boutons dupliqués
2. ✅ Fixer z-index et superpositions
3. ✅ Rendre fonctionnels les navigation items
4. ✅ Améliorer contraste des couleurs

### Phase 2 - Fonctionnalités Critiques (4-6h)
1. 🔴 Créer DataTable component (1h30)
2. 🔴 Créer StructuredReport component (2h)
3. 🔴 Créer AdvancedFilters component (1h30)
4. 🔴 Connecter filtres à l'API (1h)

### Phase 3 - Power User Mode (2-3h)
1. 🟡 Toggle Power User dans header
2. 🟡 Afficher SQL query
3. 🟡 Metadata panel
4. 🟡 Query builder visuel

### Phase 4 - Polish & Features (3-4h)
1. 🟢 Pattern detection
2. 🟢 Templates de requêtes
3. 🟢 Outils externes
4. 🟢 Collaborative features

**Total estimé: 10-15 heures**

---

## 🚨 Décisions à Prendre

### 1. Quelle priorité pour chaque fonctionnalité ?
L'utilisateur doit confirmer ce qui est le plus important.

### 2. Quel type d'utilisateur prioriser ?
- Focus sur Non-technical users (reports, visualizations)
- Focus sur Power users (data access, filters)
- Balance des deux ?

### 3. Niveau de complexité acceptable ?
- Interface simple style "Google" (minimaliste)
- Interface riche style "Tableau" (plein de features)
- Hybrid approach ?

### 4. Délais ?
- MVP rapide (Phase 1 + 2 = 6-8h)
- Produit complet (Toutes phases = 15h)

---

## 💡 Recommandations Immédiates

### Pour l'utilisateur Non-Technical
**Implémentations prioritaires:**
1. ✅ Rapports structurés avec sections claires
2. ✅ Tableaux de données formatés
3. ✅ Graphiques améliorés (plus lisibles)
4. ✅ Export PDF des rapports

**Temps estimé:** 4-5 heures

### Pour l'utilisateur Power User
**Implémentations prioritaires:**
1. ✅ Accès données brutes (tableau complet)
2. ✅ Filtres avancés avec UI
3. ✅ Query builder visuel
4. ✅ Exports multiples formats

**Temps estimé:** 5-6 heures

### Proposition Balanced
**Les 2 user personas sont importantes, donc:**
1. Créer DataTable (données brutes pour power users)
2. Créer StructuredReport (reports pour non-technical)
3. Créer AdvancedFilters (utile pour les deux)
4. Corriger les bugs visuels

**Temps estimé:** 6-8 heures

---

## ❓ Questions pour l'Utilisateur

1. Dois-je commencer par corriger les bugs visuels ou implémenter les fonctionnalités manquantes ?
2. Quel type d'utilisateur est prioritaire : Non-Technical ou Power User ?
3. Souhaitez-vous un MVP rapide (Phase 1 + Phase 2) ou un produit plus complet ?
4. Y a-t-il des fonctionnalités spécifiques que vous voulez absolument voir implémentées en premier ?
5. Préférez-vous une interface minimaliste ou riche en fonctionnalités ?

---

## 📸 Checklist Visuelle à Vérifier

Pour comprendre les problèmes actuels, pouvez-vous me dire :
- [ ] Quels boutons se répètent exactement ?
- [ ] Où voyez-vous les superpositions de couleurs ?
- [ ] Quels boutons ne fonctionnent pas quand vous cliquez dessus ?
- [ ] Y a-t-il des fonctionnalités que vous attendiez mais qui ne sont pas visibles ?
- [ ] L'interface actuelle ressemble-t-elle à ce que vous voulez ou est-ce trop différent ?

Une fois ces infos clarifiées, je peux corriger très rapidement les problèmes visuels et implémenter les fonctionnalités critiques manquantes.
