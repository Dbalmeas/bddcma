-- Script de nettoyage AMÉLIORÉ de la base de données
-- Supprime les données table par table dans le bon ordre
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, compter ce qu'il reste
SELECT
  'Comptage avant suppression' as status,
  (SELECT COUNT(*) FROM events) as events,
  (SELECT COUNT(*) FROM event_labels) as labels,
  (SELECT COUNT(*) FROM event_locations) as locations,
  (SELECT COUNT(*) FROM event_media) as media,
  (SELECT COUNT(*) FROM event_users) as users,
  (SELECT COUNT(*) FROM user_metrics) as metrics;

-- 2. Désactiver temporairement les triggers (si nécessaire)
SET session_replication_role = 'replica';

-- 3. Supprimer dans l'ordre (des tables dépendantes vers les tables principales)

-- user_metrics dépend de event_users
DELETE FROM user_metrics;

-- event_users, event_labels, event_locations, event_media dépendent de events
DELETE FROM event_labels;
DELETE FROM event_locations;
DELETE FROM event_media;
DELETE FROM event_users;

-- events (table principale)
DELETE FROM events;

-- 4. Réactiver les triggers
SET session_replication_role = 'origin';

-- 5. Vérifier que tout est vide
SELECT
  'Comptage après suppression' as status,
  (SELECT COUNT(*) FROM events) as events,
  (SELECT COUNT(*) FROM event_labels) as labels,
  (SELECT COUNT(*) FROM event_locations) as locations,
  (SELECT COUNT(*) FROM event_media) as media,
  (SELECT COUNT(*) FROM event_users) as users,
  (SELECT COUNT(*) FROM user_metrics) as metrics;

-- 6. Réinitialiser les séquences (optionnel, pour repartir de zéro avec les IDs)
-- ALTER SEQUENCE event_labels_id_seq RESTART WITH 1;
-- ALTER SEQUENCE event_locations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE event_media_id_seq RESTART WITH 1;
-- ALTER SEQUENCE event_users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_metrics_id_seq RESTART WITH 1;
