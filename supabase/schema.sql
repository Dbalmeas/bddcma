-- ============================================
-- SCHEMA DE BASE DE DONNÉES EVERDIAN
-- Pour le projet Albert School
-- ============================================

-- Activer l'extension PostGIS pour la géolocalisation
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TABLE PRINCIPALE : EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  english_sentence TEXT,
  lang TEXT,
  publish_date TIMESTAMPTZ,
  network TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE : EVENT_LABELS
-- Labels AI multi-dimensionnels
-- ============================================
CREATE TABLE IF NOT EXISTS event_labels (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE : EVENT_LOCATIONS
-- Géolocalisation (mentions, inférées, post)
-- ============================================
CREATE TABLE IF NOT EXISTS event_locations (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL, -- 'mention', 'inferred', 'post'
  name TEXT,
  label TEXT,
  layer TEXT,
  country TEXT,
  coordinates GEOGRAPHY(POINT, 4326), -- PostGIS pour lat/long
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE : EVENT_MEDIA
-- Images et vidéos associées aux événements
-- ============================================
CREATE TABLE IF NOT EXISTS event_media (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'image' ou 'video'
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE : EVENT_USERS
-- Informations sur les auteurs des posts
-- ============================================
CREATE TABLE IF NOT EXISTS event_users (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE : USER_METRICS
-- Métriques des utilisateurs (followers, rank, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS user_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES event_users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_count NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

-- Index sur events
CREATE INDEX IF NOT EXISTS idx_events_publish_date ON events(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_lang ON events(lang);
CREATE INDEX IF NOT EXISTS idx_events_network ON events(network);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Index sur labels (pour filtrage rapide)
CREATE INDEX IF NOT EXISTS idx_labels_event_id ON event_labels(event_id);
CREATE INDEX IF NOT EXISTS idx_labels_type ON event_labels(type);
CREATE INDEX IF NOT EXISTS idx_labels_value ON event_labels(value);
CREATE INDEX IF NOT EXISTS idx_labels_type_value ON event_labels(type, value);
CREATE INDEX IF NOT EXISTS idx_labels_score ON event_labels(score DESC);

-- Index sur locations (pour recherche géographique)
CREATE INDEX IF NOT EXISTS idx_locations_event_id ON event_locations(event_id);
CREATE INDEX IF NOT EXISTS idx_locations_country ON event_locations(country);
CREATE INDEX IF NOT EXISTS idx_locations_type ON event_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON event_locations USING GIST(coordinates);

-- Index sur media
CREATE INDEX IF NOT EXISTS idx_media_event_id ON event_media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON event_media(media_type);

-- Index sur users
CREATE INDEX IF NOT EXISTS idx_users_event_id ON event_users(event_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON event_users(username);

-- Index sur metrics
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON user_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON user_metrics(metric_name);

-- ============================================
-- FULL-TEXT SEARCH
-- Pour recherche dans le texte des événements
-- ============================================

-- Ajouter colonne de recherche vectorielle
ALTER TABLE events ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Fonction pour mettre à jour automatiquement le vecteur de recherche
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.english_sentence, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le vecteur à chaque insertion/update
DROP TRIGGER IF EXISTS events_search_vector_update ON events;
CREATE TRIGGER events_search_vector_update
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Index GIN pour la recherche full-text
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING gin(search_vector);

-- ============================================
-- VUES UTILES POUR LES REQUÊTES
-- ============================================

-- Vue complète avec toutes les informations jointes
CREATE OR REPLACE VIEW events_complete AS
SELECT
  e.id,
  e.text,
  e.english_sentence,
  e.lang,
  e.publish_date,
  e.network,
  e.url,
  e.created_at,
  json_agg(DISTINCT jsonb_build_object(
    'type', el.type,
    'value', el.value,
    'score', el.score
  )) FILTER (WHERE el.id IS NOT NULL) AS labels,
  json_agg(DISTINCT jsonb_build_object(
    'location_type', loc.location_type,
    'name', loc.name,
    'label', loc.label,
    'country', loc.country,
    'coordinates', ST_AsGeoJSON(loc.coordinates)::json
  )) FILTER (WHERE loc.id IS NOT NULL) AS locations,
  json_agg(DISTINCT jsonb_build_object(
    'type', m.media_type,
    'url', m.url
  )) FILTER (WHERE m.id IS NOT NULL) AS media,
  json_agg(DISTINCT jsonb_build_object(
    'username', u.username,
    'metrics', (
      SELECT json_agg(jsonb_build_object('name', um.metric_name, 'count', um.metric_count))
      FROM user_metrics um
      WHERE um.user_id = u.id
    )
  )) FILTER (WHERE u.id IS NOT NULL) AS users
FROM events e
LEFT JOIN event_labels el ON e.id = el.event_id
LEFT JOIN event_locations loc ON e.id = loc.event_id
LEFT JOIN event_media m ON e.id = m.event_id
LEFT JOIN event_users u ON e.id = u.event_id
GROUP BY e.id;

-- ============================================
-- FONCTIONS UTILES
-- ============================================

-- Fonction pour rechercher des événements par texte
CREATE OR REPLACE FUNCTION search_events(search_query TEXT, max_results INT DEFAULT 100)
RETURNS TABLE(
  id TEXT,
  text TEXT,
  english_sentence TEXT,
  publish_date TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.text,
    e.english_sentence,
    e.publish_date,
    ts_rank(e.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM events e
  WHERE e.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les événements par pays
CREATE OR REPLACE FUNCTION events_by_country(country_name TEXT, max_results INT DEFAULT 100)
RETURNS TABLE(
  id TEXT,
  text TEXT,
  english_sentence TEXT,
  publish_date TIMESTAMPTZ,
  location_label TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id,
    e.text,
    e.english_sentence,
    e.publish_date,
    loc.label AS location_label
  FROM events e
  JOIN event_locations loc ON e.id = loc.event_id
  WHERE loc.country ILIKE '%' || country_name || '%'
  ORDER BY e.publish_date DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les événements par type de label
CREATE OR REPLACE FUNCTION events_by_label(label_type TEXT, label_value TEXT, max_results INT DEFAULT 100)
RETURNS TABLE(
  id TEXT,
  text TEXT,
  english_sentence TEXT,
  publish_date TIMESTAMPTZ,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id,
    e.text,
    e.english_sentence,
    e.publish_date,
    el.score
  FROM events e
  JOIN event_labels el ON e.id = el.event_id
  WHERE el.type = label_type AND el.value = label_value
  ORDER BY e.publish_date DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Activer si vous avez besoin de multi-utilisateurs
-- ============================================

-- Pour l'instant, on désactive RLS pour simplifier
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE event_labels ENABLE ROW LEVEL SECURITY;
-- etc.

-- ============================================
-- STATISTIQUES INITIALES
-- ============================================

COMMENT ON TABLE events IS 'Table principale contenant les événements collectés depuis les sources Everdian';
COMMENT ON TABLE event_labels IS 'Labels AI multi-dimensionnels pour classifier les événements';
COMMENT ON TABLE event_locations IS 'Géolocalisation des événements (mentions, inférées, post)';
COMMENT ON TABLE event_media IS 'Images et vidéos associées aux événements';
COMMENT ON TABLE event_users IS 'Informations sur les auteurs des posts';
COMMENT ON TABLE user_metrics IS 'Métriques des utilisateurs (followers, rank, etc.)';

-- ============================================
-- FIN DU SCHEMA
-- ============================================
