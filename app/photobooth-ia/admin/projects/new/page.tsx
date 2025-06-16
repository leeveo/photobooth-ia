// Exemple de code pour la création de projet (à adapter à votre implémentation)

async function createProject(projectData) {
  // Récupérer l'ID utilisateur de la session
  const sessionData = JSON.parse(sessionStorage.getItem('admin_session') || '{}');
  const userId = sessionData.user_id;
  
  if (!userId) {
    throw new Error('Utilisateur non connecté');
  }
  
  // Ajouter l'ID utilisateur aux données du projet
  const projectWithUser = {
    ...projectData,
    created_by: userId
  };
  
  // Insérer dans Supabase
  const { data, error } = await supabase
    .from('projects')
    .insert(projectWithUser)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
