export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    console.log('🔧 DIAGNOSTIC COMPLET DES PAIEMENTS');
    
    // 1. Lister tous les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      return Response.json({ error: 'Erreur users', details: usersError.message }, { status: 500 });
    }

    // 2. Lister tous les paiements
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      return Response.json({ error: 'Erreur payments', details: paymentsError.message }, { status: 500 });
    }

    // 3. Analyser les paiements orphelins
    const orphanPayments = payments.filter(p => !p.admin_email || p.admin_email.trim() === '');
    const linkedPayments = payments.filter(p => p.admin_email && p.admin_email.trim() !== '');

    return Response.json({
      timestamp: new Date().toISOString(),
      diagnostic: {
        users_count: users.length,
        payments_total: payments.length,
        payments_orphelins: orphanPayments.length,
        payments_lies: linkedPayments.length
      },
      users: users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })),
      payments_orphelins: orphanPayments.map(p => ({
        id: p.id,
        plan: p.plan,
        quota: p.photo_quota,
        amount: p.amount,
        status: p.status,
        created_at: p.created_at,
        admin_email: p.admin_email || 'NULL'
      })),
      payments_lies: linkedPayments.map(p => ({
        id: p.id,
        plan: p.plan,
        quota: p.photo_quota,
        amount: p.amount,
        status: p.status,
        admin_email: p.admin_email,
        created_at: p.created_at
      })),
      recommandation: orphanPayments.length > 0 
        ? `Vous avez ${orphanPayments.length} paiements non liés. Utilisez /api/auto-fix-payments pour les réparer automatiquement.`
        : 'Tous les paiements sont correctement liés !'
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}