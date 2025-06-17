import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifySharedToken } from '../../../utils/sharedAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Récupérer le token depuis les cookies
  const { shared_auth_token } = req.cookies;
  
  if (!shared_auth_token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  
  // Vérifier le token et récupérer l'utilisateur
  const user = await verifySharedToken(shared_auth_token);
  
  if (!user) {
    return res.status(401).json({ error: 'Authentification invalide' });
  }
  
  try {
    const { title, rows, cols, image } = req.body;
    
    // Générer le slug à partir du titre
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Insérer le projet avec le champ created_by
    const { data, error } = await supabase
      .from('projectsmosaic')
      .insert({
        slug,
        title,
        rows,
        cols,
        image,
        created_by: user.id  // Définir le champ created_by avec l'ID utilisateur
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(200).json({ project: data });
  } catch (error) {
    console.error('Erreur création projet:', error);
    return res.status(500).json({ error: 'Échec de création du projet' });
  }
}
