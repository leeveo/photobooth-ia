import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email, planName, quota } = await request.json();
    
    // 1. Trouver l'utilisateur
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      return Response.json({ error: `Utilisateur non trouvé: ${userError.message}` });
    }

    // 2. Vérifier si un quota existe déjà
    const { data: existingQuota, error: checkError } = await supabase
      .from('admin_quotas')
      .select('*')
      .eq('admin_id', adminUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return Response.json({ error: `Erreur vérification quota: ${checkError.message}` });
    }

    // 3. Créer ou mettre à jour le quota
    if (existingQuota) {
      // Mettre à jour
      const { data: updatedQuota, error: updateError } = await supabase
        .from('admin_quotas')
        .update({
          quota_monthly: quota,
          quota_consumed: 0,
          last_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('admin_id', adminUser.id)
        .select()
        .single();

      if (updateError) {
        return Response.json({ error: `Erreur mise à jour: ${updateError.message}` });
      }

      return Response.json({ 
        success: true, 
        action: 'updated',
        quota: updatedQuota,
        user: adminUser
      });
    } else {
      // Créer nouveau quota
      const { data: newQuota, error: insertError } = await supabase
        .from('admin_quotas')
        .insert({
          admin_id: adminUser.id,
          quota_monthly: quota,
          quota_consumed: 0,
          quota_addons: 0,
          last_reset_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        return Response.json({ error: `Erreur création: ${insertError.message}` });
      }

      return Response.json({ 
        success: true, 
        action: 'created',
        quota: newQuota,
        user: adminUser
      });
    }

  } catch (error) {
    console.error('Fix quota error:', error);
    return Response.json({ error: error.message });
  }
}

export async function GET() {
  return Response.json({
    message: "Utilisez POST avec { email, planName, quota }",
    example: {
      email: "waibooth.app2@gmail.com",
      planName: "Essentiel", 
      quota: 400
    }
  });
}