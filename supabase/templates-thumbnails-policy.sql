-- Créer le bucket templates-thumbnails s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates-thumbnails', 'templates-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Pour Supabase, les politiques peuvent être créées dans l'interface utilisateur
-- Cette instruction n'affiche qu'un message pour rappeler de créer les politiques manuellement
DO $$
BEGIN
  RAISE NOTICE 'Bucket templates-thumbnails créé ou vérifié. Veuillez configurer les politiques manuellement dans l''interface Supabase:
  1. Allez à Storage > templates-thumbnails > Policies
  2. Créez les politiques suivantes:
     - SELECT: public (everyone)
     - INSERT: authenticated users only
     - UPDATE: authenticated users only
     - DELETE: authenticated users only';
END $$;
