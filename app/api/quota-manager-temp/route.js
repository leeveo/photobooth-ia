import { NextResponse } from 'next/server';

// Version temporaire sans base de données pour debug
export async function POST(req) {
  try {
    console.log(`[QUOTA_MANAGER_TEMP] === DÉBUT ===`);
    
    const body = await req.json();
    console.log(`[QUOTA_MANAGER_TEMP] Body:`, JSON.stringify(body, null, 2));
    
    const { adminId, action = 'check', sessionId, projectId } = body;
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    if (action === 'check') {
      // Retourner un quota fictif
      return NextResponse.json({
        monthly: {
          quota: 3,
          consumed: 0,
          remaining: 3,
          resetAt: new Date().toISOString(),
          isFreePlan: true,
          validation: {
            hasPayment: false,
            paymentStatus: null,
            subscriptionStatus: null,
            isExpired: false
          }
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
      console.log(`[QUOTA_MANAGER_TEMP] Simulation consommation pour session: ${sessionId}`);
      
      // Simuler la consommation (sans DB)
      return NextResponse.json({
        success: true,
        consumed: {
          type: 'monthly',
          addonPurchaseId: null
        },
        quotaStatus: {
          monthly: {
            quota: 3,
            consumed: 1, // +1 après consommation
            remaining: 2,
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
            consumed: 1,
            remaining: 2
          },
          canTakePhoto: true,
          nextQuotaSource: 'monthly'
        }
      });
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
    }

  } catch (error) {
    console.error('[QUOTA_MANAGER_TEMP] ERREUR:', error);
    console.error('[QUOTA_MANAGER_TEMP] Stack:', error.stack);
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
}