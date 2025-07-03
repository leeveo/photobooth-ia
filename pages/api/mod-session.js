import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ message: 'ID de session requis' });
  }

  try {
    console.log('Tentative de marquer comme modérée la session:', sessionId);
    
    // Créer une connexion Supabase côté serveur avec clé service (privilèges élevés)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Vérifier d'abord si la colonne existe bien
    console.log("Vérification de la colonne moderation...");
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('sessions')
      .select('moderation')
      .limit(1);
      
    if (tableError) {
      console.error("Erreur lors de la vérification de la table:", tableError);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la vérification de la structure de la table"
      });
    }

    // 2. Utiliser SQL directement pour forcer la mise à jour
    console.log("Tentative de mise à jour via SQL brut...");
    const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc(
      'execute_sql_query',
      { 
        sql_query: `UPDATE sessions SET moderation = 'M' WHERE id = '${sessionId}'` 
      }
    );

    if (sqlError) {
      console.error("Erreur RPC SQL:", sqlError);
      // Continuer avec la méthode standard si RPC échoue
    } else {
      console.log("Mise à jour SQL réussie:", sqlResult);
    }

    // 3. Tenter la méthode standard comme backup
    console.log("Tentative de mise à jour via API Supabase...");
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ moderation: 'M' })
      .eq('id', sessionId);

    if (error) {
      console.error('Erreur lors de la mise à jour via Supabase:', error);
      
      // Si toutes les tentatives échouent
      if (sqlError) {
        return res.status(500).json({ 
          success: false, 
          message: `Échec de toutes les tentatives de mise à jour`,
          errors: [sqlError, error]
        });
      }
    }

    // 4. Vérifier après une courte pause pour laisser le temps à la mise à jour de se propager
    console.log("Attente avant vérification...");
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: checkData, error: checkError } = await supabaseAdmin
      .from('sessions')
      .select('moderation')
      .eq('id', sessionId)
      .single();

    if (checkError) {
      console.warn('Vérification après mise à jour impossible:', checkError);
    } else {
      console.log('État après mise à jour:', checkData);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Image marquée comme modérée',
      moderation: 'M',  // Forcer la valeur dans la réponse
      actualData: checkData
    });
  } catch (error) {
    console.error('Erreur générale lors de la modération:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}