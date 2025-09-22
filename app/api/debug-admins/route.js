import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Récupérer quelques admin_users avec leurs paiements
    const { data: admins, error } = await supabase
      .from('admin_users')
      .select(`
        id, 
        email, 
        created_at,
        admin_payments(id, status, photo_quota, plan, amount, created_at, stripe_subscription_status),
        addon_purchases(id, addon_name, addon_value, status, price_paid)
      `)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Analyser les données pour trouver les utilisateurs avec des plans actifs
    const analysis = {
      totalUsers: admins.length,
      usersWithSucceededPayments: 0,
      usersWithAddons: 0,
      paymentStatuses: {},
      addonStatuses: {}
    };

    admins.forEach(admin => {
      // Analyser les paiements
      admin.admin_payments.forEach(payment => {
        analysis.paymentStatuses[payment.status] = (analysis.paymentStatuses[payment.status] || 0) + 1;
        if (payment.status === 'succeeded') {
          analysis.usersWithSucceededPayments++;
        }
      });

      // Analyser les addons
      admin.addon_purchases.forEach(addon => {
        analysis.addonStatuses[addon.status] = (analysis.addonStatuses[addon.status] || 0) + 1;
        if (addon.status === 'completed') {
          analysis.usersWithAddons++;
        }
      });
    });

    return NextResponse.json({ 
      admins, 
      analysis,
      message: `Trouvé ${analysis.usersWithSucceededPayments} utilisateurs avec paiements réussis et ${analysis.usersWithAddons} avec des addons`
    }, { status: 200 });

  } catch (error) {
    console.error('[DEBUG_ADMINS] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}