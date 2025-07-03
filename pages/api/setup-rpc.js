import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Créer un client Supabase avec les identifiants d'administration
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Créer la fonction RPC pour recharger le cache du schéma
    await supabaseAdmin.rpc('create_pg_function', {
      function_name: 'reload_schema_cache',
      function_definition: `
        CREATE OR REPLACE FUNCTION reload_schema_cache()
        RETURNS VOID AS $$
        BEGIN
          -- Cette fonction est un no-op mais force Supabase à actualiser son cache
          RETURN;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    // Créer la fonction RPC pour mettre à jour la modération d'une session
    await supabaseAdmin.rpc('create_pg_function', {
      function_name: 'update_session_moderation',
      function_definition: `
        CREATE OR REPLACE FUNCTION update_session_moderation(session_id UUID, mod_value TEXT)
        RETURNS VOID AS $$
        BEGIN
          UPDATE sessions SET moderation = mod_value WHERE id = session_id;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    // Créer la fonction RPC pour exécuter du SQL brut
    await supabaseAdmin.rpc('create_pg_function', {
      function_name: 'execute_sql',
      function_definition: `
        CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    return res.status(200).json({ message: 'RPC functions created successfully' });
  } catch (error) {
    console.error('Error creating RPC functions:', error);
    return res.status(500).json({ error: error.message });
  }
}
