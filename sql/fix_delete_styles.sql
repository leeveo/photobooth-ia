-- Script pour corriger l'erreur de suppression des styles
-- Ce script modifie la contrainte de clé étrangère pour permettre la suppression d'un style
-- même s'il est référencé dans la table sessions.

-- 1. Supprimer l'ancienne contrainte bloquante
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_style_id_fkey;

-- 2. Ajouter la nouvelle contrainte avec ON DELETE SET NULL
-- Cela signifie que si un style est supprimé, le champ style_id dans sessions deviendra NULL
-- mais l'historique de la session sera conservé.
ALTER TABLE public.sessions
ADD CONSTRAINT sessions_style_id_fkey
FOREIGN KEY (style_id)
REFERENCES public.styles(id)
ON DELETE SET NULL;

-- NOTE: Si la commande ci-dessus échoue car style_id est NOT NULL,
-- vous pouvez utiliser l'option CASCADE qui supprimera aussi les sessions liées :
-- 
-- ALTER TABLE public.sessions
-- ADD CONSTRAINT sessions_style_id_fkey
-- FOREIGN KEY (style_id)
-- REFERENCES public.styles(id)
-- ON DELETE CASCADE;
