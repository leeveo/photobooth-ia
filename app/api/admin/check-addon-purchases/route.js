import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { adminId } = await req.json();
    
    console.log('[CHECK_ADDON] Vérification achats pour adminId:', adminId);
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    // Récupérer tous les achats d'addon pour cet admin
    const { data: purchases, error } = await supabase
      .from('addon_purchases')
      .select('*')
      .eq('admin_user_id', adminId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CHECK_ADDON] Erreur Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[CHECK_ADDON] Achats trouvés:', purchases?.length || 0);

    return NextResponse.json({ 
      purchases: purchases || [],
      total_addon_photos: purchases?.reduce((sum, p) => sum + (p.addon_value || 0), 0) || 0
    });

  } catch (error) {
    console.error('[CHECK_ADDON] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}