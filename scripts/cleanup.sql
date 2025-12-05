-- Script de nettoyage rapide de la base de données
-- À exécuter dans Supabase SQL Editor
-- ⚠️  ATTENTION: Ceci supprimera TOUTES les données!

-- Compte les données actuelles
SELECT
  'events' as table_name,
  COUNT(*) as row_count
FROM events
UNION ALL
SELECT
  'event_labels' as table_name,
  COUNT(*) as row_count
FROM event_labels
UNION ALL
SELECT
  'event_locations' as table_name,
  COUNT(*) as row_count
FROM event_locations
UNION ALL
SELECT
  'event_media' as table_name,
  COUNT(*) as row_count
FROM event_media;

-- DÉCOMMENTEZ LES LIGNES CI-DESSOUS POUR EFFECTUER LE NETTOYAGE
-- Une fois décommentées, exécutez ce script pour supprimer toutes les données

-- TRUNCATE CASCADE est la méthode la plus rapide
-- Elle supprime instantanément toutes les données et réinitialise les indexes

-- TRUNCATE TABLE event_labels, event_locations, event_media, events CASCADE;

-- Vérification après nettoyage (décommenter après l'exécution)
-- SELECT
--   'events' as table_name,
--   COUNT(*) as row_count
-- FROM events
-- UNION ALL
-- SELECT
--   'event_labels' as table_name,
--   COUNT(*) as row_count
-- FROM event_labels
-- UNION ALL
-- SELECT
--   'event_locations' as table_name,
--   COUNT(*) as row_count
-- FROM event_locations
-- UNION ALL
-- SELECT
--   'event_media' as table_name,
--   COUNT(*) as row_count
-- FROM event_media;
