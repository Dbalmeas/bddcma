import * as fs from 'fs';
import * as path from 'path';

/**
 * Script pour exécuter toutes les requêtes SQL via les outils MCP Supabase
 * 
 * Ce script lit le fichier SQL généré et exécute chaque requête.
 * Pour l'utiliser, vous devez copier-coller les requêtes dans Supabase SQL Editor
 * ou utiliser les outils MCP manuellement.
 */

const sqlFile = path.join(__dirname, '..', 'albert-school-inserts.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

// Diviser le fichier en requêtes individuelles
const statements = sqlContent
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^INSERT INTO/i) === false);

console.log(`📝 ${statements.length} requêtes SQL trouvées`);
console.log('\n💡 Instructions:');
console.log('1. Le fichier SQL a été généré avec succès');
console.log('2. Vous pouvez exécuter toutes les requêtes de deux façons:');
console.log('   a) Copier-coller le contenu du fichier dans l\'éditeur SQL de Supabase');
console.log('   b) Utiliser les outils MCP Supabase pour exécuter chaque requête');
console.log(`\n📁 Fichier: ${sqlFile}`);
console.log(`\n⚠️  Note: Exécuter 400 requêtes via MCP peut prendre du temps.`);
console.log('   Il est recommandé d\'utiliser l\'éditeur SQL de Supabase pour une exécution plus rapide.');

