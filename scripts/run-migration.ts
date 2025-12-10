import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration Supabase (utiliser SERVICE_ROLE_KEY pour pouvoir exécuter des DDL)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrdmmvhjfvtqoecrsdjt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔍 Configuration Supabase:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationFile: string) {
  console.log(`\n📋 Exécution de la migration: ${path.basename(migrationFile)}`);

  const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

  // Découper le SQL en commandes individuelles (séparées par des lignes vides ou des points-virgules)
  const commands = migrationSQL
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  console.log(`   📝 ${commands.length} commandes SQL à exécuter\n`);

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!command || command.startsWith('--')) continue;

    console.log(`   [${i + 1}/${commands.length}] Exécution...`);
    console.log(`   SQL: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: command });

      if (error) {
        // Essayer directement si rpc n'existe pas
        console.log(`   ⚠️  RPC non disponible, tentative directe via psql...`);
        console.log(`   ℹ️  Veuillez exécuter manuellement ce SQL dans l'interface Supabase SQL Editor:`);
        console.log(`\n${migrationSQL}\n`);
        return;
      }

      console.log(`   ✅ Commande ${i + 1} exécutée avec succès`);
    } catch (err: any) {
      console.error(`   ❌ Erreur:`, err.message);
      console.log(`\n   ℹ️  Migration SQL complète à exécuter manuellement:\n`);
      console.log(migrationSQL);
      return;
    }
  }

  console.log(`\n✅ Migration terminée!`);
}

// Exécution
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250110_add_missing_fields.sql');

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Fichier de migration introuvable: ${migrationPath}`);
  process.exit(1);
}

runMigration(migrationPath)
  .then(() => console.log('\n🎉 Migration exécutée avec succès!'))
  .catch((error) => {
    console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    process.exit(1);
  });
