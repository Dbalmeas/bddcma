
# Prompts Cursor - CMA CGM Talk to Data

Ce dossier contient des prompts et documentation pour aider Claude (dans Cursor) à comprendre et travailler avec le projet.

## 📁 Fichiers disponibles

### 1. `supabase-database-structure.md` ⭐
**Description** : Documentation complète de la base de données Supabase  
**Utilisation** : Référence Claude vers ce fichier pour toute question sur la structure BDD  
**Contenu** :
- Structure détaillée des tables (36 colonnes bookings, 18 colonnes dtl_sequences)
- Description de chaque colonne avec exemples
- Index de performance
- Vues matérialisées
- Fonctions SQL utilitaires
- Patterns d'utilisation courants
- Statistiques des données
- Bonnes pratiques

**Quand l'utiliser** :
- Création de nouvelles requêtes SQL
- Analyse de données
- Optimisation de performance
- Compréhension du modèle de données

### 2. `supabase-quick-reference.md` ⚡
**Description** : Référence rapide (1 page) pour utilisation quotidienne  
**Utilisation** : Pour rappels rapides de la structure  
**Contenu** :
- Structure en 30 secondes
- Fonctions principales
- Pattern de base
- Points clés à retenir

**Quand l'utiliser** :
- Rappel rapide de la structure
- Vérification syntax SQL
- Références aux fonctions utilitaires

### 3. `optimize-supabase-config.md`
**Description** : Plan d'optimisation Supabase (déjà appliqué)  
**Utilisation** : Référence pour futures optimisations  
**Status** : ✅ Appliqué (9 déc 2025)

## 🎯 Comment utiliser dans Cursor

### Méthode 1 : Mention directe
```
@supabase-database-structure.md Comment calculer le top 10 des clients en 2020 ?
```

### Méthode 2 : Context dans .cursorrules
Ajouter dans `.cursorrules` :
```
Quand tu travailles avec la base de données Supabase, 
réfère-toi à .cursor/prompts/supabase-database-structure.md
pour comprendre la structure des tables.
```

### Méthode 3 : Prompt initial
Au début d'une session :
```
Lis le fichier .cursor/prompts/supabase-database-structure.md 
pour comprendre la structure de notre base de données.
```

## 💡 Cas d'usage

### Exemple 1 : Créer une requête
**Vous** : 
```
@supabase-database-structure.md
Je veux obtenir le top 10 des clients qui ont réservé le plus de TEU 
sur la route Chine → Europe en 2020
```

**Claude** utilisera la doc pour :
- Identifier les bonnes colonnes (`origin`, `destination`, `partner_code`)
- Utiliser la fonction `get_top_clients()` ou créer une requête
- Appliquer les bonnes pratiques (filtrer `job_status != 9`)

### Exemple 2 : Analyse de données
**Vous** :
```
@supabase-database-structure.md
Analyse la répartition des conteneurs réfrigérés par port de chargement
```

**Claude** utilisera :
- Table `dtl_sequences` pour `reef_flag`
- Table `bookings` pour `point_load` et `point_load_desc`
- Pattern de jointure correct

### Exemple 3 : Optimisation
**Vous** :
```
Ma requête sur les volumes mensuels est lente, comment l'optimiser ?
```

**Claude** suggérera :
- Utiliser `mv_client_monthly_volumes` (vue matérialisée)
- Vérifier les index disponibles
- Appliquer les bonnes pratiques

## 🔄 Mise à jour

Quand la structure de la BDD change :

1. Mettre à jour `supabase-database-structure.md`
2. Mettre à jour `supabase-quick-reference.md`
3. Dater la mise à jour en bas du fichier
4. Commit les changements

## 📚 Autres ressources

- Documentation Supabase : https://supabase.com/docs
- PostgreSQL : https://www.postgresql.org/docs/
- MCP Supabase : `.cursor/mcp-supabase-guide.md`

## 🎓 Tips

1. **Toujours mentionner le fichier avec @** pour que Claude le lise
2. **Référence rapide en premier** pour questions simples
3. **Doc complète pour** nouvelles features ou analyses complexes
4. **Combiner avec d'autres contextes** : `@supabase-database-structure.md @lib/supabase.ts`

---

**Dernière mise à jour** : 9 décembre 2025  
**Maintainer** : Alexis Meniante
