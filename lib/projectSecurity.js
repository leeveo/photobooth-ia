import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Vérifie si le projet appartient à l'admin spécifié
export async function verifyProjectOwnership(projectId, adminId) {
  if (!projectId || !adminId) return false;
  
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('created_by', adminId)
      .single();
      
    if (error || !data) return false;
    
    return true;
  } catch (error) {
    console.error('Error verifying project ownership:', error);
    return false;
  }
}

// Récupère l'ID admin à partir de la session stockée
export function getAdminIdFromSession() {
  try {
    const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
    if (!sessionStr) return null;
    
    const sessionData = JSON.parse(sessionStr);
    return sessionData.user_id || null;
  } catch (error) {
    console.error('Error retrieving admin ID from session:', error);
    return null;
  }
}
