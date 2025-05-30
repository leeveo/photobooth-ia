/**
 * Instructions pour configurer le stockage Supabase via l'interface d'administration
 * 
 * 1. Accédez à votre projet Supabase
 * 2. Allez dans la section "Storage"
 * 3. Créez les buckets suivants avec les politiques de sécurité indiquées
 */

/**
 * Bucket: backgrounds
 * Public: false
 * 
 * Policies:
 * 
 * - SELECT (download) pour tous les utilisateurs authentifiés:
 * ((bucket_id = 'backgrounds'::text) AND (auth.role() = 'authenticated'::text))
 * 
 * - SELECT pour les utilisateurs anonymes uniquement pour les fichiers partagés:
 * ((bucket_id = 'backgrounds'::text) AND storage.foldername(name) = 'shared')
 * 
 * - INSERT/UPDATE/DELETE uniquement pour les administrateurs:
 * ((bucket_id = 'backgrounds'::text) AND (auth.role() = 'authenticated'::text) AND (is_admin() = true))
 */

/**
 * Bucket: styles
 * Public: false
 * 
 * Policies:
 * 
 * - SELECT (download) pour tous les utilisateurs authentifiés et anonymes:
 * (bucket_id = 'styles'::text)
 * 
 * - INSERT/UPDATE/DELETE uniquement pour les administrateurs:
 * ((bucket_id = 'styles'::text) AND (auth.role() = 'authenticated'::text) AND (is_admin() = true))
 */

/**
 * Bucket: settings
 * Public: false
 * 
 * Policies:
 * 
 * - SELECT (download) pour tous les utilisateurs:
 * (bucket_id = 'settings'::text)
 * 
 * - INSERT/UPDATE/DELETE uniquement pour les administrateurs:
 * ((bucket_id = 'settings'::text) AND (auth.role() = 'authenticated'::text) AND (is_admin() = true))
 */
