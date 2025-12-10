import * as fs from 'fs';
import * as path from 'path';

// Lire le fichier SQL
const sqlFile = path.join(__dirname, '..', 'albert-school-inserts.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

// Diviser le fichier en requêtes individuelles (séparées par des points-virgules)
// On va traiter les INSERT par batch
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 ${statements.length} requêtes SQL à exécuter`);

// Instructions pour l'utilisateur
console.log('\n📋 Instructions:');
console.log('1. Le fichier SQL a été généré avec succès');
console.log('2. Vous pouvez maintenant exécuter les requêtes via les outils MCP Supabase');
console.log('3. Ou copier-coller le contenu dans l\'éditeur SQL de Supabase');
console.log(`\n📁 Fichier: ${sqlFile}`);
console.log(`\n💡 Pour exécuter via MCP, utilisez mcp_supabase_execute_sql avec les requêtes par batch`);




