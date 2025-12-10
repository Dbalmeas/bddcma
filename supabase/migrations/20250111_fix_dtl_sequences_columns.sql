-- Migration: Correction des colonnes manquantes dans dtl_sequences
-- Date: 2025-01-11
-- Objectif: S'assurer que toutes les colonnes nécessaires existent dans dtl_sequences

-- Vérifier et ajouter nb_teu si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'nb_teu'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN nb_teu NUMERIC;
        RAISE NOTICE 'Colonne nb_teu ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne nb_teu existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter nb_units si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'nb_units'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN nb_units NUMERIC;
        RAISE NOTICE 'Colonne nb_units ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne nb_units existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter commodity_description si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'commodity_description'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN commodity_description TEXT;
        RAISE NOTICE 'Colonne commodity_description ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne commodity_description existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter net_weight si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'net_weight'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN net_weight NUMERIC;
        RAISE NOTICE 'Colonne net_weight ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne net_weight existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter haz_flag si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'haz_flag'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN haz_flag BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne haz_flag ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne haz_flag existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter reef_flag si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'reef_flag'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN reef_flag BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne reef_flag ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne reef_flag existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter is_reefer si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'is_reefer'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN is_reefer BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne is_reefer ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne is_reefer existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter oversize_flag si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'oversize_flag'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN oversize_flag BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne oversize_flag ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne oversize_flag existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter is_oog si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'is_oog'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN is_oog BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne is_oog ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne is_oog existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter package_code si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'package_code'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN package_code TEXT;
        RAISE NOTICE 'Colonne package_code ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne package_code existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter commodity_code_lara si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dtl_sequences' 
        AND column_name = 'commodity_code_lara'
    ) THEN
        ALTER TABLE dtl_sequences ADD COLUMN commodity_code_lara TEXT;
        RAISE NOTICE 'Colonne commodity_code_lara ajoutée à dtl_sequences';
    ELSE
        RAISE NOTICE 'Colonne commodity_code_lara existe déjà';
    END IF;
END $$;

-- Vérifier que la table dtl_sequences existe, sinon la créer complètement
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'dtl_sequences'
    ) THEN
        CREATE TABLE dtl_sequences (
            job_reference TEXT NOT NULL,
            job_dtl_sequence INTEGER NOT NULL,
            nb_teu NUMERIC,
            nb_units NUMERIC,
            commodity_description TEXT,
            net_weight NUMERIC,
            haz_flag BOOLEAN DEFAULT FALSE,
            reef_flag BOOLEAN DEFAULT FALSE,
            is_reefer BOOLEAN DEFAULT FALSE,
            oversize_flag BOOLEAN DEFAULT FALSE,
            is_oog BOOLEAN DEFAULT FALSE,
            package_code TEXT,
            commodity_code_lara TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (job_reference, job_dtl_sequence),
            CONSTRAINT fk_dtl_sequences_booking 
                FOREIGN KEY (job_reference) 
                REFERENCES bookings(job_reference) 
                ON DELETE CASCADE
        );
        
        -- Créer les index
        CREATE INDEX IF NOT EXISTS idx_dtl_sequences_job_ref ON dtl_sequences(job_reference);
        CREATE INDEX IF NOT EXISTS idx_dtl_sequences_commodity ON dtl_sequences(commodity_description);
        
        RAISE NOTICE 'Table dtl_sequences créée avec toutes les colonnes';
    END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN dtl_sequences.nb_teu IS 'Nombre de TEU (Twenty-foot Equivalent Unit) pour cette séquence';
COMMENT ON COLUMN dtl_sequences.nb_units IS 'Nombre d''unités de conteneurs';
COMMENT ON COLUMN dtl_sequences.commodity_description IS 'Description de la marchandise transportée';
COMMENT ON COLUMN dtl_sequences.net_weight IS 'Poids net de la marchandise';
