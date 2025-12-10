/**
 * Script de test pour vérifier la connexion Supabase
 * 
 * Usage: tsx scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 Test de connexion Supabase\n');
console.log('Configuration:');
console.log(`  URL: ${supabaseUrl || '❌ MANQUANTE'}`);
console.log(`  Anon Key: ${supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ MANQUANTE'}`);
console.log(`  Service Key: ${supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '⚠️  Non configurée (optionnel)'}\n`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes !');
  console.error('   Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies dans .env.local');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test 1: Connexion de base
console.log('📡 Test 1: Connexion de base...');
try {
  const { data, error } = await supabase.from('bookings').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('   ❌ Erreur:', error.message);
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.error('   💡 Les tables n\'existent peut-être pas encore. Exécutez les migrations SQL d\'abord.');
    }
  } else {
    console.log('   ✅ Connexion réussie !');
    console.log(`   📊 Nombre de bookings: ${data || 'N/A'}`);
  }
} catch (err: any) {
  console.error('   ❌ Erreur de connexion:', err.message);
}

// Test 2: Vérifier les tables principales
console.log('\n📋 Test 2: Vérification des tables...');
const tables = ['bookings', 'dtl_sequences'];

for (const table of tables) {
  try {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`   ⚠️  Table "${table}": ${error.message}`);
    } else {
      console.log(`   ✅ Table "${table}": existe`);
    }
  } catch (err: any) {
    console.log(`   ❌ Table "${table}": ${err.message}`);
  }
}

// Test 3: Test avec service role key (si disponible)
if (supabaseServiceKey) {
  console.log('\n🔐 Test 3: Connexion avec Service Role Key...');
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { error } = await supabaseService.from('bookings').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('   ❌ Erreur:', error.message);
    } else {
      console.log('   ✅ Connexion avec Service Role Key réussie !');
    }
  } catch (err: any) {
    console.error('   ❌ Erreur:', err.message);
  }
}

console.log('\n✅ Tests terminés !');
console.log('\n💡 Si tous les tests passent, votre connexion Supabase fonctionne correctement.');
console.log('   Vous pouvez utiliser le client Supabase directement dans vos scripts.');
