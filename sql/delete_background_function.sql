-- Fonction pour supprimer un arrière-plan avec contournement RLS
-- Cette fonction s'exécute avec les privilèges du propriétaire de la fonction (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION delete_background_by_id(
  background_id UUID,
  project_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_background RECORD;
  result JSON;
BEGIN
  -- Vérifier que l'arrière-plan existe et appartient au projet
  SELECT * INTO deleted_background
  FROM backgrounds 
  WHERE id = background_id AND backgrounds.project_id = delete_background_by_id.project_id;
  
  -- Si l'arrière-plan n'existe pas
  IF deleted_background IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Background not found or access denied'
    );
  END IF;
  
  -- Supprimer l'arrière-plan
  DELETE FROM backgrounds 
  WHERE id = background_id AND backgrounds.project_id = delete_background_by_id.project_id;
  
  -- Vérifier que la suppression a eu lieu
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to delete background'
    );
  END IF;
  
  -- Retourner le résultat de succès
  RETURN json_build_object(
    'success', true,
    'message', 'Background deleted successfully',
    'deleted_background', row_to_json(deleted_background)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION delete_background_by_id(UUID, UUID) TO authenticated;
