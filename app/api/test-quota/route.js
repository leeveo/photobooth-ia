import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    console.log(`[TEST_QUOTA] === DÉBUT TEST ===`);
    
    const body = await req.json();
    console.log(`[TEST_QUOTA] Body:`, JSON.stringify(body, null, 2));
    
    const { adminId, action = 'check' } = body;
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    if (action === 'check') {
      // Test simple - juste retourner un quota fictif
      return NextResponse.json({
        success: true,
        adminId: adminId,
        monthly: {
          quota: 3,
          consumed: 0,
          remaining: 3,
          resetAt: new Date().toISOString(),
          isFreePlan: true
        },
        addons: {
          total: 0,
          remaining: 0,
          packs: []
        },
        total: {
          quota: 3,
          consumed: 0,
          remaining: 3
        },
        canTakePhoto: true,
        nextQuotaSource: 'monthly'
      });
    } else if (action === 'consume') {
      console.log(`[TEST_QUOTA] Test consommation...`);
      
      // Test simple - juste dire que ça marche
      return NextResponse.json({
        success: true,
        message: 'Test consommation OK',
        consumed: {
          type: 'monthly',
          addonPurchaseId: null
        }
      });
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });

  } catch (error) {
    console.error('[TEST_QUOTA] ERREUR:', error);
    console.error('[TEST_QUOTA] Stack:', error.stack);
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Test quota API fonctionne' });
}