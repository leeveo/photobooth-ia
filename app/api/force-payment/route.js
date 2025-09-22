import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { adminId, paymentData } = await req.json();
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    console.log(`[FORCE_PAYMENT] Création manuelle de paiement pour admin: ${adminId}`);

    // Récupérer l'utilisateur
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('id', adminId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Créer un paiement manuel pour débloquer la situation
    const newPayment = {
      admin_user_id: adminId,
      status: 'succeeded', // Forcé à succeeded pour débloquer
      plan: paymentData.plan || 'price_1RdtbBIgKYOzHnxEwrDVPJdI',
      amount: paymentData.amount || 2900, // 29.00€
      photo_quota: paymentData.photo_quota || 100,
      stripe_subscription_status: 'active',
      photo_quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
      quota_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      stripe_payment_id: `manual_${Date.now()}`,
      stripe_customer_id: `manual_customer_${adminId}`,
      images_included: paymentData.photo_quota || 100
    };

    const { data: insertedPayment, error: insertError } = await supabase
      .from('admin_payments')
      .insert([newPayment])
      .select()
      .single();

    if (insertError) {
      console.error('[FORCE_PAYMENT] Erreur insertion:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`[FORCE_PAYMENT] Paiement créé avec succès:`, insertedPayment);

    // Vérifier le nouveau quota
    const quotaCheck = await fetch(`${req.nextUrl.origin}/api/quota-manager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, action: 'check' })
    });

    const quotaData = await quotaCheck.json();

    return NextResponse.json({
      success: true,
      message: `Paiement manuel créé pour ${adminUser.email}`,
      payment: insertedPayment,
      newQuota: quotaData
    });

  } catch (error) {
    console.error('[FORCE_PAYMENT] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}