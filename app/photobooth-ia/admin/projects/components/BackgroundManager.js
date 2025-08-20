'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine } from 'react-icons/ri';
import BackgroundTemplatesMultiType from '../../components/BackgroundTemplatesMultiType';
import Loader from './Loader';

const BackgroundManager = ({ 
  projectId, 
  backgrounds, 
  setBackgrounds, 
  setError, 
  setSuccess 
}) => {
  const supabase = createClientComponentClient();
  const [showBackgroundTemplates, setShowBackgroundTemplates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAnimated, setShowAnimated] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState({});
  const [deletingBackground, setDeletingBackground] = useState({});
  
  // Function to refresh session if needed
  const ensureValidSession = async () => {
    try {
      console.log('🔐 [SESSION CHECK] Checking session validity...');
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ [SESSION CHECK] Error refreshing session:', error);
        return null;
      }
      
      const { session } = data;
      
      if (!session) {
        console.error('❌ [SESSION CHECK] No session after refresh');
        return null;
      }
      
      console.log('✅ [SESSION CHECK] Session refreshed successfully:', session.user?.id);
      return session;
    } catch (error) {
      console.error('❌ [SESSION CHECK] Exception during session check:', error);
      return null;
    }
  };

  // Function to debug session and authentication state
  const debugAuthState = async () => {
    try {
      console.log('🕵️ [DEBUG AUTH] Starting authentication state debug...');
      
      // Check session
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🕵️ [DEBUG AUTH] Session data:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at,
        error: error?.message
      });

      // Check if we can access user data
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🕵️ [DEBUG AUTH] User data:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        error: userError?.message
      });

      return !!session && !!user;
    } catch (error) {
      console.error('🕵️ [DEBUG AUTH] Error during auth debug:', error);
      return false;
    }
  };
  
  // Debug deleting state
  useEffect(() => {
    console.log('🔄 [DELETING STATE] Deleting background state changed:', deletingBackground);
  }, [deletingBackground]);
  
  // États pour le popup de confirmation de suppression
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);

  // Debug delete confirm state
  useEffect(() => {
    console.log('🔔 [DELETE CONFIRM] State changed:', { showDeleteConfirm, deleteConfirmData });
  }, [showDeleteConfirm, deleteConfirmData]);

  async function handleDeleteBackground(backgroundId) {
    console.log('🎯 [DELETE BACKGROUND] Starting delete process for background:', backgroundId);
    const background = backgrounds.find(bg => bg.id === backgroundId);
    console.log('🎯 [DELETE BACKGROUND] Found background:', background);
    console.log('🎯 [DELETE BACKGROUND] All backgrounds:', backgrounds);
    
    setDeleteConfirmData({
      type: 'background',
      id: backgroundId,
      name: background?.name || 'Arrière-plan',
      action: () => performDeleteBackground(backgroundId)
    });
    setShowDeleteConfirm(true);
    console.log('🎯 [DELETE BACKGROUND] Showing confirmation dialog');
  }

  // Fonction séparée pour effectuer la suppression
  const performDeleteBackground = async (backgroundId) => {
    console.log('🚀 [PERFORM DELETE] Starting actual delete for background:', backgroundId);
    console.log('🚀 [PERFORM DELETE] Project ID:', projectId);
    
    try {
      setError(null);
      setDeletingBackground(prev => ({ ...prev, [backgroundId]: true }));
      console.log('🚀 [PERFORM DELETE] Set deleting state to true');
      
      // Vérification de session préliminaire
      console.log('🔐 [PERFORM DELETE] Checking session...');
      let session = null;
      
      // First try to get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [PERFORM DELETE] Session error at start:', sessionError);
        // Try to refresh session
        session = await ensureValidSession();
        if (!session) {
          setError("Erreur de session: " + sessionError.message + ". Veuillez vous reconnecter.");
          return;
        }
      } else if (!currentSession) {
        console.error('❌ [PERFORM DELETE] No session found at start, trying to refresh...');
        // Try to refresh session
        session = await ensureValidSession();
        if (!session) {
          setError("Session expirée, veuillez vous reconnecter");
          return;
        }
      } else {
        session = currentSession;
      }
      
      console.log('✅ [PERFORM DELETE] Proceeding with background deletion...');
      
      console.log('🗑️ Attempting to delete background:', backgroundId);
      
      // Try API route first
      try {
        console.log('📡 Trying API route method...');
        console.log('📡 API request data:', { backgroundId, projectId });
        
        const response = await fetch('/api/backgrounds/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            backgroundId: backgroundId,
            projectId: projectId
          }),
        });

        console.log('📡 API Response status:', response.status);
        console.log('📡 API Response headers:', response.headers);
        
        const result = await response.json();
        console.log('📡 API response:', { status: response.status, result });

        if (response.ok) {
          console.log('✅ Background deleted successfully via API:', result);
          
          // Update the local state
          setBackgrounds(prevBackgrounds => {
            const newBackgrounds = prevBackgrounds.filter(bg => bg.id !== backgroundId);
            console.log('📝 Updated backgrounds state:', newBackgrounds.length, 'backgrounds remaining');
            console.log('📝 Backgrounds before filter:', prevBackgrounds.map(bg => ({ id: bg.id, name: bg.name })));
            console.log('📝 Backgrounds after filter:', newBackgrounds.map(bg => ({ id: bg.id, name: bg.name })));
            return newBackgrounds;
          });
          
          setSuccess(result.message || "Arrière-plan supprimé avec succès");
          return;
        } else {
          console.warn('⚠️ API route failed, trying direct Supabase method...', result);
          throw new Error('API route failed: ' + (result.error || 'Unknown error'));
        }
      } catch (apiError) {
        console.warn('⚠️ API route method failed, falling back to direct Supabase:', apiError.message);
        console.error('⚠️ Full API error:', apiError);
        
        // Fallback to direct Supabase access
        console.log('🔄 Trying direct Supabase method...');
        
        // Get the current session again (fresh check)
        console.log('🔄 [FALLBACK] Checking session for direct Supabase method...');
        let freshSession = null;
        
        const { data: { session: directSession }, error: freshSessionError } = await supabase.auth.getSession();
        
        if (freshSessionError || !directSession) {
          console.warn('⚠️ [FALLBACK] Session issue, trying to refresh...', freshSessionError?.message);
          freshSession = await ensureValidSession();
          if (!freshSession) {
            setError("Session expirée, veuillez vous reconnecter");
            return;
          }
        } else {
          freshSession = directSession;
        }
        
        console.log('✅ Fresh session found in direct method:', freshSession.user?.id);
        
        // First, check if the background exists and belongs to the project
        console.log('🔍 Checking if background exists...');
        const { data: existingBackground, error: fetchError } = await supabase
          .from('backgrounds')
          .select('id, name, project_id')
          .eq('id', backgroundId)
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching background:', fetchError);
          throw new Error(`Impossible de trouver l'arrière-plan: ${fetchError.message}`);
        }
        
        if (!existingBackground) {
          console.error('❌ Background not found');
          throw new Error("L'arrière-plan n'existe pas ou a déjà été supprimé");
        }
        
        console.log('✅ Background found:', existingBackground);
        
        // Verify it belongs to the current project
        if (existingBackground.project_id !== projectId) {
          console.error('❌ Background belongs to different project:', existingBackground.project_id, 'vs', projectId);
          throw new Error("Vous n'avez pas les permissions pour supprimer cet arrière-plan");
        }
        
        // Try to disable RLS temporarily for this operation
        console.log('🔧 Attempting deletion with RLS bypass...');
        
        // Delete the background from the database
        console.log('🗑️ Executing delete query...');
        const { data: deletedData, error: deleteError } = await supabase
          .from('backgrounds')
          .delete()
          .eq('id', backgroundId)
          .eq('project_id', projectId)
          .select();
          
        if (deleteError) {
          console.error('❌ Direct delete error:', deleteError);
          
          // If RLS is the issue, try with a function call
          console.log('🔧 Trying with RPC function...');
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('delete_background_by_id', {
              background_id: backgroundId,
              project_id: projectId
            });
            
          if (rpcError) {
            console.error('❌ RPC delete error:', rpcError);
            throw new Error(`Erreur de suppression: ${rpcError.message}`);
          }
          
          console.log('✅ Background deleted via RPC:', rpcResult);
        } else {
          console.log('✅ Background deleted directly:', deletedData);
          
          // Verify deletion was successful
          if (!deletedData || deletedData.length === 0) {
            console.error('❌ No records deleted');
            throw new Error("La suppression a échoué - aucun enregistrement supprimé");
          }
        }
        
        // Update the local state
        setBackgrounds(prevBackgrounds => {
          const newBackgrounds = prevBackgrounds.filter(bg => bg.id !== backgroundId);
          console.log('📝 Updated backgrounds state:', newBackgrounds.length, 'backgrounds remaining');
          console.log('📝 Backgrounds before filter:', prevBackgrounds.map(bg => ({ id: bg.id, name: bg.name })));
          console.log('📝 Backgrounds after filter:', newBackgrounds.map(bg => ({ id: bg.id, name: bg.name })));
          return newBackgrounds;
        });
        
        setSuccess(`Arrière-plan "${existingBackground.name}" supprimé avec succès`);
      }
      
    } catch (error) {
      console.error('❌ Error deleting background:', error);
      console.error('❌ Error stack:', error.stack);
      setError(`Erreur lors de la suppression de l'arrière-plan: ${error.message}`);
    } finally {
      console.log('🏁 [PERFORM DELETE] Cleanup - removing deleting state');
      setDeletingBackground(prev => {
        const newState = { ...prev };
        delete newState[backgroundId];
        console.log('🏁 [PERFORM DELETE] New deleting state:', newState);
        return newState;
      });
    }
  };

  // Updated function to handle backgrounds added from templates via API
  const handleBackgroundTemplatesAdded = async (backgroundsData) => {
    console.log(`✅ Backgrounds from templates added:`, backgroundsData);
    
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Close the template popup immediately
      setShowBackgroundTemplates(false);
      
      // backgroundsData should be an array of backgrounds from the database
      if (Array.isArray(backgroundsData) && backgroundsData.length > 0) {
        console.log('Updating backgrounds state with:', backgroundsData);
        // Update backgrounds with the new data
        setBackgrounds(backgroundsData);
        setSuccess(`${backgroundsData.length} arrière-plan(s) ajouté(s) avec succès !`);
      } else {
        console.log('No backgrounds data received, refreshing from database...');
        // Fallback: refresh from database
        await refreshBackgroundsFromDatabase();
        setSuccess("Arrière-plans ajoutés avec succès !");
      }
      
    } catch (error) {
      console.error("Error handling template backgrounds:", error);
      setError(error.message);
      // Try to refresh anyway
      console.log('Error occurred, attempting to refresh from database...');
      await refreshBackgroundsFromDatabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add this new function to refresh backgrounds directly from the database
  const refreshBackgroundsFromDatabase = async () => {
    try {
      console.log("Refreshing backgrounds from database...");
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée, veuillez vous reconnecter");
        return;
      }
      
      // Get fresh data from the database
      const { data, error } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (error) {
        console.error("Error fetching backgrounds:", error);
        setError("Failed to refresh backgrounds");
        return;
      }
      
      console.log("Fresh background data:", data);
      
      // Update the state with the fresh data
      setBackgrounds(data || []);
      
    } catch (err) {
      console.error("Error in refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle template errors
  const handleBackgroundTemplatesError = (errorMessage) => {
    setError(errorMessage);
    setShowBackgroundTemplates(false);
  };

  // Helper function to ensure we have a full URL
  const getFullImageUrl = (url) => {
    if (!url) return null;
    
    // Check if it's already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's just a storage path, convert to public URL
    const publicUrlResponse = supabase.storage.from('backgrounds').getPublicUrl(url);
    
    // Handle different versions of Supabase client
    const publicUrl = publicUrlResponse.data?.publicUrl || // newer versions
                      publicUrlResponse.publicURL || // older versions
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/backgrounds/${url}`;
    
    console.log('Original URL:', url);
    console.log('Public URL:', publicUrl);
    
    return publicUrl;
  };

  // Debug backgrounds data
  useEffect(() => {
    console.log('🔄 [BACKGROUNDS STATE] Backgrounds data updated:', backgrounds);
    console.log('🔄 [BACKGROUNDS STATE] Number of backgrounds:', backgrounds.length);
    console.log('🔄 [BACKGROUNDS STATE] Background IDs:', backgrounds.map(bg => bg.id));
    console.log('🔄 [BACKGROUNDS STATE] Background names:', backgrounds.map(bg => bg.name));
    
    // Check for duplicate IDs
    const ids = backgrounds.map(bg => bg.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.warn('⚠️ [BACKGROUNDS STATE] Duplicate background IDs detected!', ids);
    }
  }, [backgrounds]);

  const handleToggleShowAnimated = async (backgroundId, currentValue) => {
    // Cette fonction est désactivée car show_animated est maintenant automatiquement true
    // quand des vidéos sont présentes
    console.log('handleToggleShowAnimated désactivée - show_animated géré automatiquement');
    return;
  };

  // Function to delete individual media from a background
  const handleDeleteIndividualMedia = async (backgroundId, mediaType) => {
    console.log('🎭 [HANDLE DELETE MEDIA] Starting media delete process:', { backgroundId, mediaType });
    
    const mediaNames = {
      'image_url': 'image horizontale',
      'image_url_vertical': 'image verticale',
      'video_url': 'vidéo horizontale',
      'video_url_vertical': 'vidéo verticale'
    };

    const background = backgrounds.find(bg => bg.id === backgroundId);
    console.log('🎭 [HANDLE DELETE MEDIA] Found background:', background);
    console.log('🎭 [HANDLE DELETE MEDIA] Current media value:', background?.[mediaType]);
    
    setDeleteConfirmData({
      type: 'media',
      id: backgroundId,
      mediaType,
      name: mediaNames[mediaType],
      backgroundName: background?.name || 'Arrière-plan',
      action: () => performDeleteIndividualMedia(backgroundId, mediaType)
    });
    setShowDeleteConfirm(true);
    console.log('🎭 [HANDLE DELETE MEDIA] Showing confirmation dialog');
  };

  // Fonction séparée pour effectuer la suppression de média
  const performDeleteIndividualMedia = async (backgroundId, mediaType) => {
    console.log('🎬 [PERFORM DELETE MEDIA] Starting media delete:', { backgroundId, mediaType });
    
    const mediaNames = {
      'image_url': 'image horizontale',
      'image_url_vertical': 'image verticale',
      'video_url': 'vidéo horizontale',
      'video_url_vertical': 'vidéo verticale'
    };

    // Create unique key for this deletion
    const deletionKey = `${backgroundId}-${mediaType}`;
    console.log('🎬 [PERFORM DELETE MEDIA] Deletion key:', deletionKey);
    
    try {
      setError(null);
      setDeletingMedia(prev => ({ ...prev, [deletionKey]: true }));
      console.log('🎬 [PERFORM DELETE MEDIA] Set deleting media state to true');
      
      // TEMPORARY TEST: Skip authentication checks and API, go directly to Supabase
      console.log('🧪 [PERFORM DELETE MEDIA] TESTING MODE: Direct Supabase update...');
      
      try {
        // Get current session (simple check)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🧪 [TEST] Session check:', { hasSession: !!session, userId: session?.user?.id });
        
        // Simple update operation
        const updateData = { [mediaType]: null };
        console.log('🧪 [TEST] Attempting to update background:', backgroundId, 'with data:', updateData);
        
        const { data: updatedData, error: updateError } = await supabase
          .from('backgrounds')
          .update(updateData)
          .eq('id', backgroundId)
          .select();
        
        console.log('🧪 [TEST] Supabase update result:', { 
          updatedData: updatedData, 
          error: updateError,
          errorCode: updateError?.code,
          errorMessage: updateError?.message,
          errorDetails: updateError?.details 
        });
        
        if (updateError) {
          console.error('🧪 [TEST] Update failed with error:', updateError);
          setError(`Erreur de mise à jour: ${updateError.message} (Code: ${updateError.code})`);
          return;
        }
        
        if (!updatedData || updatedData.length === 0) {
          console.error('🧪 [TEST] No records were updated');
          setError("Aucun enregistrement n'a été mis à jour");
          return;
        }
        
        console.log('🧪 [TEST] Update successful! Updated record:', updatedData[0]);
        
        // Update local state
        setBackgrounds(backgrounds.map(bg => {
          if (bg.id === backgroundId) {
            return { ...bg, [mediaType]: null };
          }
          return bg;
        }));
        
        setSuccess(`TEST RÉUSSI: ${mediaNames[mediaType]} supprimée avec succès`);
        
      } catch (testError) {
        console.error('🧪 [TEST] Exception during test:', testError);
        setError(`Erreur de test: ${testError.message}`);
      }
      
      // Try API route first (it handles session on server side)
      try {
        console.log('📡 [PERFORM DELETE MEDIA] Trying API route method...');
        console.log('📡 [PERFORM DELETE MEDIA] API request data:', { backgroundId, mediaType });
        
        // Check current session before making API call
        const { data: { session: preCallSession } } = await supabase.auth.getSession();
        console.log('📡 [PERFORM DELETE MEDIA] Pre-API call session check:', { 
          hasSession: !!preCallSession, 
          userId: preCallSession?.user?.id,
          expires: preCallSession?.expires_at 
        });
        
        const response = await fetch('/api/backgrounds/delete-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin', // Important: include cookies
          body: JSON.stringify({
            backgroundId: backgroundId,
            mediaType: mediaType
          }),
        });

        console.log('📡 [PERFORM DELETE MEDIA] API Response status:', response.status);
        
        const result = await response.json();
        console.log('📡 [PERFORM DELETE MEDIA] API response:', { status: response.status, result });

        if (response.ok) {
          console.log('✅ [PERFORM DELETE MEDIA] Media deleted successfully via API:', result);
          
          // Update the local state
          console.log('📝 [PERFORM DELETE MEDIA] Updating local state...');
          console.log('📝 [PERFORM DELETE MEDIA] Current backgrounds before update:', backgrounds.map(bg => ({ id: bg.id, [mediaType]: bg[mediaType] })));
          
          setBackgrounds(backgrounds.map(bg => {
            if (bg.id === backgroundId) {
              const updatedBg = { ...bg, [mediaType]: null };
              console.log('📝 [PERFORM DELETE MEDIA] Updated background:', { id: bg.id, before: bg[mediaType], after: updatedBg[mediaType] });
              return updatedBg;
            }
            return bg;
          }));
          
          console.log('📝 [PERFORM DELETE MEDIA] Local state updated');
          
          setSuccess(result.message || `${mediaNames[mediaType]} supprimée avec succès`);
          console.log('✅ [PERFORM DELETE MEDIA] Success message set');
          return;
        } else {
          console.warn('⚠️ [PERFORM DELETE MEDIA] API route failed:', result);
          
          // Check if it's an authentication error
          if (response.status === 401) {
            console.error('🔒 [PERFORM DELETE MEDIA] Authentication error - session expired, but continuing...');
            // Continue without redirecting
          }
          
          throw new Error('API route failed: ' + (result.error || 'Unknown error'));
        }
      } catch (apiError) {
        console.warn('⚠️ [PERFORM DELETE MEDIA] API route method failed, falling back to direct Supabase:', apiError.message);
        console.error('⚠️ [PERFORM DELETE MEDIA] Full API error:', apiError);
        
        // Fallback to direct Supabase access
        console.log('🔄 [PERFORM DELETE MEDIA] Trying direct Supabase method...');
        
        // Vérification de session pour média
        console.log('🔐 [PERFORM DELETE MEDIA] Checking session...');
        let session = null;
        
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [PERFORM DELETE MEDIA] Session error:', sessionError);
          console.log('🔄 [PERFORM DELETE MEDIA] Continuing without session...');
          session = null; // Continue without session
        } else if (!currentSession) {
          console.error('❌ [PERFORM DELETE MEDIA] No session found, but continuing...');
          session = null; // Continue without session
        } else {
          session = currentSession;
        }
        
        console.log('✅ [PERFORM DELETE MEDIA] Proceeding with media deletion...');
        
        // Update the background to set the specific media field to null
        const updateData = { [mediaType]: null };
        console.log('🎬 [PERFORM DELETE MEDIA] Update data:', updateData);
        console.log('🎬 [PERFORM DELETE MEDIA] Updating background ID:', backgroundId);
        
        const { data: updatedData, error } = await supabase
          .from('backgrounds')
          .update(updateData)
          .eq('id', backgroundId)
          .select();
          
        console.log('🎬 [PERFORM DELETE MEDIA] Supabase update result:', { updatedData, error });
          
        if (error) {
          console.error('❌ [PERFORM DELETE MEDIA] Supabase error:', error);
          throw error;
        }
        
        if (!updatedData || updatedData.length === 0) {
          console.error('❌ [PERFORM DELETE MEDIA] No records updated');
          throw new Error("Aucun enregistrement mis à jour");
        }
        
        console.log('✅ [PERFORM DELETE MEDIA] Database updated successfully:', updatedData);
        
        // Update the local state
        console.log('📝 [PERFORM DELETE MEDIA] Updating local state...');
        console.log('📝 [PERFORM DELETE MEDIA] Current backgrounds before update:', backgrounds.map(bg => ({ id: bg.id, [mediaType]: bg[mediaType] })));
        
        setBackgrounds(backgrounds.map(bg => {
          if (bg.id === backgroundId) {
            const updatedBg = { ...bg, [mediaType]: null };
            console.log('📝 [PERFORM DELETE MEDIA] Updated background:', { id: bg.id, before: bg[mediaType], after: updatedBg[mediaType] });
            return updatedBg;
          }
          return bg;
        }));
        
        console.log('📝 [PERFORM DELETE MEDIA] Local state updated');
        
        setSuccess(`${mediaNames[mediaType]} supprimée avec succès`);
        console.log('✅ [PERFORM DELETE MEDIA] Success message set');
      }
      
    } catch (error) {
      console.error('❌ [PERFORM DELETE MEDIA] Error deleting media:', error);
      console.error('❌ [PERFORM DELETE MEDIA] Error stack:', error.stack);
      setError(`Erreur lors de la suppression de la ${mediaNames[mediaType]}: ${error.message}`);
    } finally {
      console.log('🏁 [PERFORM DELETE MEDIA] Cleanup - removing deleting media state');
      setDeletingMedia(prev => {
        const newState = { ...prev };
        delete newState[deletionKey];
        console.log('🏁 [PERFORM DELETE MEDIA] New deleting media state:', newState);
        return newState;
      });
    }
  };

  return (
    <>
      {/* Custom Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-200 scale-100">
            <div className="text-center">
              {/* Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmer la suppression
              </h3>
              
              {/* Message */}
              <div className="text-sm text-gray-500 mb-6">
                {deleteConfirmData?.type === 'background' ? (
                  <>
                    Êtes-vous sûr de vouloir supprimer l'arrière-plan{' '}
                    <span className="font-semibold text-gray-700">"{deleteConfirmData.name}"</span> ?
                    <br />
                    <span className="text-red-500 font-medium">Cette action est irréversible.</span>
                  </>
                ) : (
                  <>
                    Êtes-vous sûr de vouloir supprimer la{' '}
                    <span className="font-semibold text-gray-700">{deleteConfirmData?.name}</span>{' '}
                    de l'arrière-plan{' '}
                    <span className="font-semibold text-gray-700">"{deleteConfirmData?.backgroundName}"</span> ?
                    <br />
                    <span className="text-red-500 font-medium">Cette action est irréversible.</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  console.log('✅ [CONFIRM DELETE] Confirmation button clicked');
                  console.log('✅ [CONFIRM DELETE] Delete data:', deleteConfirmData);
                  setShowDeleteConfirm(false);
                  console.log('✅ [CONFIRM DELETE] About to call action function');
                  try {
                    deleteConfirmData?.action();
                    console.log('✅ [CONFIRM DELETE] Action function called successfully');
                  } catch (error) {
                    console.error('❌ [CONFIRM DELETE] Error calling action function:', error);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-gray-500">Arrière-plans du projet ({backgrounds.length})</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowBackgroundTemplates(true)}
                className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-lg shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Ajouter des images ou vidéos
              </button>
              <button
                onClick={refreshBackgroundsFromDatabase}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                title="Actualiser la liste des arrière-plans"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          {isRefreshing ? (
            <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
              <div className="flex justify-center items-center">
                <svg className="animate-spin h-5 w-5 text-indigo-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-500">Actualisation des arrière-plans...</span>
              </div>
            </div>
          ) : backgrounds.length === 0 ? (
            <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">
                Aucun arrière-plan n'a été ajouté à ce projet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 justify-center place-items-center">
              {backgrounds.map((background) => (
                <div
                  key={background.id}
                  className="w-full max-w-7xl border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-lg flex flex-col mx-auto"
                >
                  {/* En-tête avec le nom et les actions */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{background.name}</h4>
                        <p className="text-indigo-100 text-sm">ID: {background.id?.substring(0, 8)}...</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            console.log('🔴 [DELETE BUTTON] Button clicked for background:', background.id);
                            console.log('🔴 [DELETE BUTTON] Background data:', background);
                            console.log('🔴 [DELETE BUTTON] Is deleting?', deletingBackground[background.id]);
                            handleDeleteBackground(background.id);
                          }}
                          disabled={deletingBackground[background.id]}
                          className="inline-flex items-center px-3 py-2 bg-red-500 bg-opacity-20 text-white text-sm font-medium rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingBackground[background.id] ? (
                            <Loader size="small" message="" variant="default" />
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Supprimer
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section d'affichage des médias */}
                  <div className="p-6">
                    {/* Grille pour les médias */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      
                      {/* Images Section */}
                      <div className="space-y-4">
                        <h5 className="text-lg font-semibold text-gray-800 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Images
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Image Horizontale */}
                          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                            <div className="bg-blue-500 px-3 py-2">
                              <div className="flex justify-between items-center">
                                <h6 className="text-white text-sm font-medium flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2m-5 4v6m-3-3h6" />
                                  </svg>
                                  Horizontale (Desktop)
                                </h6>
                                {background.image_url && (
                                  <button
                                    onClick={() => handleDeleteIndividualMedia(background.id, 'image_url')}
                                    disabled={deletingMedia[`${background.id}-image_url`]}
                                    className="text-white hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Supprimer cette image"
                                  >
                                    {deletingMedia[`${background.id}-image_url`] ? (
                                      <Loader size="small" message="" variant="default" />
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="aspect-[16/10] relative bg-gray-100">
                              {background.image_url ? (
                                <Image
                                  src={getFullImageUrl(background.image_url)}
                                  alt={`${background.name} - Horizontale`}
                                  fill
                                  style={{ objectFit: "cover" }}
                                  unoptimized={true}
                                  className="hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    console.error('Horizontal image failed to load:', getFullImageUrl(background.image_url));
                                    // Remove the broken image by hiding the container
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Aucune image horizontale</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {background.image_url && (
                              <div className="p-3 bg-white">
                                <a 
                                  href={background.image_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 break-all"
                                >
                                  Voir l'image →
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Image Verticale */}
                          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                            <div className="bg-green-500 px-3 py-2">
                              <div className="flex justify-between items-center">
                                <h6 className="text-white text-sm font-medium flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Verticale (Mobile)
                                </h6>
                                {background.image_url_vertical && (
                                  <button
                                    onClick={() => handleDeleteIndividualMedia(background.id, 'image_url_vertical')}
                                    disabled={deletingMedia[`${background.id}-image_url_vertical`]}
                                    className="text-white hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Supprimer cette image"
                                  >
                                    {deletingMedia[`${background.id}-image_url_vertical`] ? (
                                      <Loader size="small" message="" variant="default" />
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="aspect-[10/16] relative bg-gray-100">
                              {background.image_url_vertical ? (
                                <Image
                                  src={getFullImageUrl(background.image_url_vertical)}
                                  alt={`${background.name} - Verticale`}
                                  fill
                                  style={{ objectFit: "cover" }}
                                  unoptimized={true}
                                  className="hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    console.error('Vertical image failed to load:', getFullImageUrl(background.image_url_vertical));
                                    // Remove the broken image by hiding the container
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Aucune image verticale</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {background.image_url_vertical && (
                              <div className="p-3 bg-white">
                                <a 
                                  href={background.image_url_vertical} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 hover:text-green-800 break-all"
                                >
                                  Voir l'image →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Videos Section */}
                      <div className="space-y-4">
                        <h5 className="text-lg font-semibold text-gray-800 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Vidéos
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Vidéo Horizontale */}
                          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                            <div className="bg-purple-500 px-3 py-2">
                              <div className="flex justify-between items-center">
                                <h6 className="text-white text-sm font-medium flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2m-5 4v6m-3-3h6" />
                                  </svg>
                                  Horizontale (Desktop)
                                </h6>
                                {background.video_url && (
                                  <button
                                    onClick={() => handleDeleteIndividualMedia(background.id, 'video_url')}
                                    disabled={deletingMedia[`${background.id}-video_url`]}
                                    className="text-white hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Supprimer cette vidéo"
                                  >
                                    {deletingMedia[`${background.id}-video_url`] ? (
                                      <Loader size="small" message="" variant="default" />
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="aspect-[16/10] relative bg-gray-100">
                              {background.video_url ? (
                                <video
                                  key={`video-h-${background.id}-${Date.now()}`}
                                  src={background.video_url}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  controls={true}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onLoadedData={(e) => {
                                    console.log(`Vidéo horizontale chargée pour background ${background.id}`);
                                    e.target.play().catch(err => console.error("Erreur lecture vidéo horizontale:", err));
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Aucune vidéo horizontale</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {background.video_url && (
                              <div className="p-3 bg-white">
                                <a 
                                  href={background.video_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-purple-600 hover:text-purple-800 break-all"
                                >
                                  Voir la vidéo →
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Vidéo Verticale */}
                          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                            <div className="bg-orange-500 px-3 py-2">
                              <div className="flex justify-between items-center">
                                <h6 className="text-white text-sm font-medium flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Verticale (Mobile)
                                </h6>
                                {background.video_url_vertical && (
                                  <button
                                    onClick={() => handleDeleteIndividualMedia(background.id, 'video_url_vertical')}
                                    disabled={deletingMedia[`${background.id}-video_url_vertical`]}
                                    className="text-white hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Supprimer cette vidéo"
                                  >
                                    {deletingMedia[`${background.id}-video_url_vertical`] ? (
                                      <Loader size="small" message="" variant="default" />
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="aspect-[10/16] relative bg-gray-100">
                              {background.video_url_vertical ? (
                                <video
                                  key={`video-v-${background.id}-${Date.now()}`}
                                  src={background.video_url_vertical}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  controls={true}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onLoadedData={(e) => {
                                    console.log(`Vidéo verticale chargée pour background ${background.id}`);
                                    e.target.play().catch(err => console.error("Erreur lecture vidéo verticale:", err));
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Aucune vidéo verticale</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {background.video_url_vertical && (
                              <div className="p-3 bg-white">
                                <a 
                                  href={background.video_url_vertical} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange-600 hover:text-orange-800 break-all"
                                >
                                  Voir la vidéo →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section informations */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Indicateur de statut vidéo automatique */}
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${(background.video_url || background.video_url_vertical) ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                            <span className="text-sm font-medium text-gray-700">
                              {(background.video_url || background.video_url_vertical) ? 
                                "Animation vidéo activée automatiquement" : 
                                "Aucune vidéo disponible pour l'animation"}
                            </span>
                          </div>
                        </div>
                        
                        {/* Compteur de médias */}
                        <div className="text-sm text-gray-500">
                          {[
                            background.image_url && 'Image H',
                            background.image_url_vertical && 'Image V', 
                            background.video_url && 'Vidéo H',
                            background.video_url_vertical && 'Vidéo V'
                          ].filter(Boolean).join(' • ') || 'Aucun média'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Background templates popup */}
          {showBackgroundTemplates && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <BackgroundTemplatesMultiType
                projectId={projectId}
                onBackgroundsAdded={handleBackgroundTemplatesAdded}
                onError={handleBackgroundTemplatesError}
                onClose={() => setShowBackgroundTemplates(false)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BackgroundManager;
