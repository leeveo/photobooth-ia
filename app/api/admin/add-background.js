import { createClient } from '@supabase/supabase-js';
import multiparty from 'multiparty';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('[API] Erreur parsing FormData:', err);
      return res.status(400).json({ success: false, error: 'Erreur parsing FormData' });
    }

    const projectId = fields.projectId?.[0];
    const video_url = fields.video_url?.[0];
    const file = files.file?.[0];

    console.log('[API] Champs reçus:', { projectId, video_url, file });

    // Si on reçoit un fichier (image), on traite l'ajout d'un background image
    if (file) {
      // ...traitement image existant...
      return res.status(400).json({ success: false, error: 'Traitement image non implémenté ici' });
    }

    // Si on reçoit projectId et video_url, on fait l'update du background actif
    if (projectId && video_url) {
      const { data, error } = await supabase
        .from('backgrounds')
        .update({ video_url })
        .eq('project_id', projectId)
        .eq('is_active', true)
        .select('*');

      if (error) {
        console.error('[API] Erreur lors de la mise à jour en base:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      console.log('[API] Background vidéo mis à jour avec succès:', data);

      return res.status(200).json({ success: true, data });
    }

    // Si ni fichier ni video_url, erreur
    console.error('[API] Project ID et video_url sont requis');
    return res.status(400).json({ success: false, error: 'Project ID et video_url sont requis' });
  });
}