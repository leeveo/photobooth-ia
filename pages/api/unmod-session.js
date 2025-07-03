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
    console.log('Attempting to unmoderate session:', sessionId);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('sessions')
      .update({ moderation: null })
      .eq('id', sessionId);

    if (error) {
      console.error('Error during unmoderation:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Image unmoderated successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
}
      console.warn('Verification after unmoderation failed:', checkError);
    } else {
      console.log('Status after unmoderation:', checkData);
    }

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: 'Image unmoderated successfully',
      moderation: checkData?.moderation || null
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
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
