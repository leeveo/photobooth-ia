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
    console.log('Tentative de démodérer la session:', sessionId);
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ moderation: null })
      .eq('id', sessionId);

    if (error) {
      console.error('Erreur:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Image démodérée avec succès'
    });
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
      .select('moderation')
      .eq('id', sessionId)
      .single();

    if (checkError) {
      console.warn('Vérification après démodération impossible:', checkError);
    } else {
      console.log('État après démodération:', checkData);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Image démodérée avec succès',
      moderation: checkData?.moderation
    });
  } catch (error) {
    console.error('Erreur générale lors de la démodération:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}
