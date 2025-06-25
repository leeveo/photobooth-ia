'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ParametrePage() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      // Récupère l'ID de l'admin connecté depuis la session (comme dans tes autres pages)
      const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
      if (!sessionStr) return;
      let decodedSession = sessionStr;
      try { decodedSession = atob(sessionStr); } catch {}
      const sessionData = JSON.parse(decodedSession);
      const userId = sessionData.user_id || sessionData.userId;
      if (!userId) return;

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error) setUser(data);
      setLoading(false);
    }
    fetchUser();
  }, [supabase]);

  if (loading) return <div>Chargement...</div>;
  if (!user) return <div>Utilisateur non trouvé.</div>;

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Paramètres de l'abonnement</h1>
      <div className="space-y-4">
        <div><strong>Email :</strong> {user.email}</div>
        <div><strong>Plan :</strong> {user.plan || 'Aucun'}</div>
        <div><strong>Quota photos :</strong> {user.photo_quota || 0}</div>
        <div><strong>Prochain reset quota :</strong> {user.photo_quota_reset_at ? new Date(user.photo_quota_reset_at).toLocaleDateString() : '-'}</div>
        <div><strong>Stripe customer ID :</strong> {user.stripe_customer_id || '-'}</div>
        <div><strong>Stripe subscription ID :</strong> {user.stripe_subscription_id || '-'}</div>
        {/* Tu peux ajouter ici un bouton pour gérer l'abonnement (upgrade/cancel) */}
      </div>
    </div>
  );
}
