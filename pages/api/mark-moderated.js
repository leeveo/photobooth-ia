import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID required' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('sessions')
      .update({ moderation: 'M' })
      .eq('id', sessionId);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Image marked as moderated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
        message: `Erreur de mise à jour: ${error.message}`,
        error: error
      });
    }

    // Vérifier que la mise à jour a bien été effectuée
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
      moderation: checkData?.moderation || 'M'
    });
  } catch (error) {
    console.error('Erreur générale lors de la modération:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}
    }

    // Vérifier que la mise à jour a bien été effectuée
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from('sessions')
      .select('moderation')
      .eq('id', sessionId)
      .single();

    return res.status(200).json({ 
      success: true, 
      message: 'Image marquée comme modérée',
      moderation: checkData?.moderation || null
    });
  } catch (error) {
    console.error('Erreur lors de la modération:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}
