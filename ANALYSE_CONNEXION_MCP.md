# 🔍 Analyse du problème de connexion MCP Supabase

## 📋 Problème identifié

L'erreur affichée dans le navigateur indique :
```
Failed to fetch details for API authorization request
Error: OAuth authorization request does not exist
```

Cette erreur survient lors de la tentative de connexion à Supabase via MCP (Model Context Protocol) dans Cursor.

## 🔎 Causes possibles

### 1. **Requête OAuth expirée ou invalide**
- Les requêtes d'autorisation OAuth ont une durée de vie limitée
- Si vous avez fermé la fenêtre d'autorisation ou attendu trop longtemps, la requête expire
- La requête peut avoir été supprimée côté serveur Supabase

### 2. **Configuration MCP Supabase manquante ou incorrecte**
- Le serveur MCP Supabase n'est pas configuré dans Cursor
- Les identifiants Supabase (URL, clés API) sont incorrects ou manquants
- Le flux OAuth n'a pas été correctement initialisé

### 3. **Problème de synchronisation entre Cursor et Supabase**
- La session OAuth n'a pas été correctement établie
- Les tokens d'autorisation ont expiré ou sont invalides
- Problème de redirection OAuth (callback URL incorrecte)

## ✅ Solutions recommandées

### Solution 1 : Réinitialiser la connexion OAuth

1. **Dans Cursor** :
   - Allez dans les paramètres (Settings)
   - Cherchez la section "MCP Servers" ou "Model Context Protocol"
   - Supprimez la configuration Supabase existante
   - Redémarrez Cursor

2. **Reconfigurez le serveur MCP Supabase** :
   - Ajoutez un nouveau serveur MCP Supabase
   - Suivez le processus d'autorisation OAuth depuis le début
   - **Ne fermez pas** la fenêtre d'autorisation avant de compléter le processus

### Solution 2 : Vérifier la configuration MCP dans Cursor

Le fichier de configuration MCP se trouve généralement dans :
- **macOS** : `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- **Windows** : `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- **Linux** : `~/.config/Cursor/User/globalStorage/mcp.json`

Vérifiez que la configuration ressemble à ceci :
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_ANON_KEY": "votre-clé-anon"
      }
    }
  }
}
```

### Solution 3 : Utiliser les variables d'environnement du projet

Au lieu de passer par OAuth, vous pouvez configurer MCP avec les clés API directement :

1. **Récupérez vos identifiants Supabase** :
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet
   - Allez dans Settings > API
   - Copiez l'URL du projet et la clé `anon` (ou `service_role` pour plus de permissions)

2. **Configurez MCP avec les variables d'environnement** :
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-supabase"
         ],
         "env": {
           "SUPABASE_URL": "https://zrdmmvhjfvtqoecrsdjt.supabase.co",
           "SUPABASE_ANON_KEY": "votre-clé-anon-ici"
         }
       }
     }
   }
   ```

### Solution 4 : Alternative - Utiliser directement le client Supabase

Si MCP continue à poser problème, vous pouvez utiliser directement le client Supabase dans vos scripts :

**Exemple dans `scripts/execute-albert-inserts.ts`** :
```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrdmmvhjfvtqoecrsdjt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Lire et exécuter le fichier SQL
const sqlFile = path.join(__dirname, '..', 'albert-school-inserts.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

// Diviser en requêtes et exécuter
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
  if (error) {
    console.error('❌ Erreur:', error);
  }
}
```

## 🔧 Vérifications à effectuer

### 1. Vérifier les variables d'environnement

Assurez-vous que votre fichier `.env.local` contient :
```env
NEXT_PUBLIC_SUPABASE_URL=https://zrdmmvhjfvtqoecrsdjt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role (optionnel, pour plus de permissions)
```

### 2. Tester la connexion Supabase directement

Créez un script de test :
```typescript
// scripts/test-supabase-connection.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test de connexion
supabase.from('bookings').select('count').then(({ error }) => {
  if (error) {
    console.error('❌ Erreur de connexion:', error);
  } else {
    console.log('✅ Connexion Supabase réussie !');
  }
});
```

### 3. Vérifier les ressources MCP disponibles

Dans Cursor, vous pouvez vérifier si MCP fonctionne en listant les ressources disponibles. Si aucune ressource n'apparaît, MCP n'est pas correctement configuré.

## 📝 Recommandations

1. **Pour un développement rapide** : Utilisez directement le client Supabase dans vos scripts plutôt que MCP
2. **Pour l'intégration avec l'IA de Cursor** : Configurez correctement MCP avec les variables d'environnement (Solution 3)
3. **Pour l'exécution de migrations SQL** : Utilisez l'éditeur SQL de Supabase directement plutôt que MCP

## 🚨 Problèmes connus avec MCP Supabase

- Les requêtes OAuth peuvent expirer rapidement
- La configuration initiale peut être complexe
- Les erreurs ne sont pas toujours clairement affichées
- La synchronisation entre Cursor et Supabase peut être problématique

## 💡 Solution immédiate recommandée

**Utilisez l'éditeur SQL de Supabase** pour exécuter vos migrations :

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez-collez le contenu de `albert-school-inserts.sql`
5. Cliquez sur **Run**

C'est plus rapide et plus fiable que MCP pour l'exécution de migrations SQL.
