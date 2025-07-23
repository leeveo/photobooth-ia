-- Ajoute la colonne "type" à la table "styles" dans Supabase/Postgres

ALTER TABLE styles
ADD COLUMN type TEXT;
