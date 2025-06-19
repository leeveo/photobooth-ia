import { NextResponse } from 'next/server';
import { setupRequiredRlsPolicies } from '../../../utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Appeler la fonction de configuration des politiques RLS
    const result = await setupRequiredRlsPolicies();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la configuration des politiques RLS:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    }, { status: 500 });
  }
}
