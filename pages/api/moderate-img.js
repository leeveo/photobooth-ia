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
    console.log('Moderating session:', sessionId);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('sessions')
      .update({ moderation: 'M' })
      .eq('id', sessionId);

    if (error) {
      console.error('Error during moderation:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Image marked as moderated'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
