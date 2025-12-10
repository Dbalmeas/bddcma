/**
 * Script pour exécuter des requêtes SQL directement via le client Supabase
 * Alternative à MCP qui ne nécessite pas de configuration OAuth
 * 
 * Usage: tsx scripts/execute-sql-direct.ts [fichier.sql]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes !');
  console.error('   Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) sont définies dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour exécuter une requête SQL via RPC (nécessite une fonction SQL dans Supabase)
async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Note: Cette méthode nécessite que vous ayez créé une fonction SQL dans Supabase
    // qui permet d'exécuter du SQL dynamique. Pour des raisons de sécurité, Supabase
    // ne permet pas d'exécuter du SQL arbitraire directement.
    
    // Alternative: Utiliser l'API REST directement pour les INSERT simples
    console.warn('⚠️  Exécution directe de SQL non supportée par défaut.');
    console.warn('   Utilisez plutôt l\'éditeur SQL de Supabase ou créez une fonction RPC.');
    
    return { success: false, error: 'Méthode non implémentée - utilisez l\'éditeur SQL de Supabase' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Fonction pour parser et afficher les requêtes SQL
function parseSQLFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Diviser en requêtes (séparées par des points-virgules)
  const statements = content
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  return statements;
}

// Main
async function main() {
  const sqlFile = process.argv[2] || path.join(__dirname, '..', 'albert-school-inserts.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ Fichier non trouvé: ${sqlFile}`);
    process.exit(1);
  }
  
  console.log('📂 Lecture du fichier SQL...');
  console.log(`   Fichier: ${sqlFile}\n`);
  
  const statements = parseSQLFile(sqlFile);
  console.log(`📝 ${statements.length} requêtes SQL trouvées\n`);
  
  console.log('💡 Instructions:');
  console.log('   Pour des raisons de sécurité, Supabase ne permet pas d\'exécuter');
  console.log('   du SQL arbitraire directement via l\'API.');
  console.log('\n   Options recommandées:');
  console.log('   1. Utilisez l\'éditeur SQL de Supabase:');
  console.log('      - Allez sur https://supabase.com/dashboard');
  console.log('      - Sélectionnez votre projet');
  console.log('      - Allez dans SQL Editor');
  console.log('      - Copiez-collez le contenu du fichier SQL');
  console.log('      - Cliquez sur Run');
  console.log('\n   2. Pour les INSERT simples, utilisez le client Supabase:');
  console.log('      - Créez des fonctions TypeScript qui utilisent supabase.from().insert()');
  console.log('      - Voir scripts/ingest-albert-school-csv.ts pour un exemple');
  console.log('\n   3. Configurez MCP Supabase correctement (voir ANALYSE_CONNEXION_MCP.md)');
  
  // Afficher un aperçu des premières requêtes
  console.log('\n📋 Aperçu des premières requêtes:');
  statements.slice(0, 3).forEach((stmt, idx) => {
    const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
    console.log(`   ${idx + 1}. ${preview}...`);
  });
  
  if (statements.length > 3) {
    console.log(`   ... et ${statements.length - 3} autres requêtes`);
  }
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
