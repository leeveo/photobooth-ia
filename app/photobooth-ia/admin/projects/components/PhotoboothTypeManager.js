'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const PhotoboothTypeManager = ({ 
  project, 
  setProject, 
  typeValidated, 
  setTypeValidated, 
  setError, 
  setSuccess 
}) => {
  const supabase = createClientComponentClient();

  // Function to get photobooth type label
  const getPhotoboothTypeLabel = (type) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'photobooth2':
        return 'MiniMax';
      case 'standard':
        return 'FaceSwapping';
      default:
        return 'Premium'; // Changed default to Premium
    }
  };

  // Fonction pour valider le type de photobooth
  const handleValidatePhotoboothType = async () => {
    try {
      // Mettre à jour le projet dans Supabase avec l'attribut type_validated = true
      const { error } = await supabase
        .from('projects')
        .update({ type_validated: true })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setProject({...project, type_validated: true});
      setTypeValidated(true);
      setSuccess('Type de photobooth validé avec succès. Le type ne peut plus être modifié.');
    } catch (error) {
      console.error('Erreur lors de la validation du type:', error);
      setError('Erreur lors de la validation du type de photobooth');
    }
  };

  // Function to update photobooth type
  const updatePhotoboothType = async (type) => {
    if (typeValidated) return; // Don't update if type is already validated
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ photobooth_type: type })
        .eq('id', project.id);
      
      if (!error) {
        setProject({...project, photobooth_type: type});
        setSuccess('Type de photobooth mis à jour');
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error updating photobooth type:', error);
      setError(`Erreur lors de la mise à jour du type de photobooth: ${error.message}`);
    }
  };

  // Set default type to premium if not already set
  if (!project.photobooth_type) {
    updatePhotoboothType('premium');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
          <span className="text-white font-semibold">2</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Type de photobooth</h3>
      </div>

      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-gray-500">Type de Photobooth</h4>
          {typeValidated && (
            <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Type validé et verrouillé
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="grid grid-cols-1 gap-3">
            {/* Standard type button is commented out
            <button
              onClick={() => updatePhotoboothType('standard')}
              disabled={typeValidated && project.photobooth_type !== 'standard'}
              className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
                project.photobooth_type === 'standard' || !project.photobooth_type 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : typeValidated 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 002-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm font-medium">FaceSwapping</span>
            </button>
            */}
            
            <button
              onClick={() => updatePhotoboothType('premium')}
              disabled={typeValidated && project.photobooth_type !== 'premium'}
              className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
                project.photobooth_type === 'premium' || !project.photobooth_type
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : typeValidated 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium">Premium</span>
            </button>
            
            {/* MiniMax type button is commented out
            <button
              onClick={() => updatePhotoboothType('photobooth2')}
              disabled={typeValidated && project.photobooth_type !== 'photobooth2'}
              className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
                project.photobooth_type === 'photobooth2' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : typeValidated 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 002.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">MiniMax</span>
            </button>
            */}
          </div>
          
          {/* Add the validation button here, after the grid and centered */}
          {!typeValidated && project && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleValidatePhotoboothType}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors shadow-sm"
              >
                Valider le type de photobooth
              </button>
            </div>
          )}
          
          <p className="mt-2 text-xs text-gray-500">
            Type de photobooth: {getPhotoboothTypeLabel(project.photobooth_type || 'premium')}
            {typeValidated && <span className="text-orange-500 ml-2 font-medium">Ce choix est définitif et ne peut plus être modifié.</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoboothTypeManager;
