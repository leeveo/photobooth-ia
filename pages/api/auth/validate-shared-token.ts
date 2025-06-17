import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySharedToken, supabase } from '../../../utils/sharedAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token requis' });
  }

  try {
    const user = await verifySharedToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    // Retourner les informations utilisateur
    return res.status(200).json({ 
      user: {
        id: user.id,
        email: user.email,
        company_name: user.company_name,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Erreur validation token:', error);
    return res.status(500).json({ error: 'Erreur serveur interne' });
  }
}
