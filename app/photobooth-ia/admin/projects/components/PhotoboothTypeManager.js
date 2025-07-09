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

  // Fonction pour retourner la description du type de photobooth
  const getPhotoboothTypeDescription = (type) => {
    switch (type) {
      case 'premium':
      default:
        return (
          <>
            <p className="mb-2">
              Le <span className="font-semibold text-indigo-700">Photobooth Premium IA</span> offre une expérience enrichie grâce à l'intelligence artificielle&nbsp;:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>
                <span className="font-semibold">Génération d'images IA</span> : Créez des photos uniques et créatives à partir de vos prises de vue.
              </li>
              <li>
                <span className="font-semibold">Changement de coupe de cheveux</span> : Essayez virtuellement différentes coiffures en temps réel.
              </li>
              <li>
                <span className="font-semibold">Amélioration de la qualité</span> : L'IA optimise automatiquement la netteté, la luminosité et les couleurs de vos photos.
              </li>
              <li>
                <span className="font-semibold">Effets avancés</span> : Ajoutez des filtres artistiques, des fonds dynamiques ou des éléments fun.
              </li>
              <li>
                <span className="font-semibold">Personnalisation poussée</span> : Intégrez logos, textes ou cadres selon vos besoins événementiels.
              </li>
            </ul>
            <div className="mt-3 text-xs text-indigo-600 italic">
              Idéal pour des événements innovants, des animations interactives et pour offrir une expérience mémorable à vos utilisateurs.
            </div>
          </>
        );
    }
  };

  // Set default type to premium if not already set
  if (!project.photobooth_type) {
    updatePhotoboothType('premium');
  }

  return (
   <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
            <span className="text-white font-semibold">3</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              
              Type de Photobooth 
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Choisissez le type de photobooth pour votre projet. Ce choix est définitif et ne peut plus être modifié une fois validé.
            </p>
          </div>
        </div>
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

        {/* Nouvelle disposition en deux colonnes */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colonne gauche : carte design pour le type Premium */}
          <div>
            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => !typeValidated && updatePhotoboothType('premium')}
                className={`
                  relative cursor-pointer overflow-hidden
                  rounded-3xl
                  shadow-[0_8px_32px_0_rgba(99,102,241,0.18)]
                  transition-transform duration-200
                  ${project.photobooth_type === 'premium' || !project.photobooth_type
                    ? 'scale-105'
                    : typeValidated
                      ? 'opacity-60 cursor-not-allowed grayscale'
                      : 'hover:scale-105'
                  }
                  group
                `}
                style={{
                  backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/makeup_pastel_clown.jpg')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  minHeight: '260px',
                  maxWidth: '380px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px 0 rgba(99,102,241,0.18)',
                  borderRadius: '1.5rem' // Assure le round sur l'image elle-même
                }}
                disabled={typeValidated && project.photobooth_type !== 'premium'}
              >
                {/* Glassmorphism + gradient + glow */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl"
                  style={{
                    background: 'linear-gradient(120deg, rgba(255,255,255,0.18) 60%, rgba(139,92,246,0.10) 100%)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    boxShadow: '0 0 0 4px rgba(139,92,246,0.08), 0 8px 32px 0 rgba(99,102,241,0.10)',
                    zIndex: 1
                  }}
                ></div>
                {/* Glow border effect */}
                <div
                  className="absolute inset-0 rounded-3xl border border-white/30 shadow-lg pointer-events-none"
                  style={{
                    boxShadow: '0 0 32px 8px rgba(139,92,246,0.12), 0 2px 16px 0 rgba(99,102,241,0.10) inset',
                    zIndex: 2
                  }}
                ></div>
                {/* Content */}
                <div className="relative z-10 w-full h-full flex flex-col justify-center items-center text-center px-6 py-8 rounded-3xl shadow-lg border border-white/30">
                  <div className="flex items-center justify-center mb-3">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-300 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                  </div>
                  <h4 className="text-2xl font-extrabold text-white drop-shadow mb-2 tracking-tight">Premium</h4>
                  <p className="text-sm text-white/90 mb-3">Expérience IA enrichie, effets avancés, personnalisation poussée</p>
                  {project.photobooth_type === 'premium' && (
                    <span className="inline-block mt-2 px-4 py-1 bg-green-500/90 text-white text-xs font-semibold rounded-full shadow">Sélectionné</span>
                  )}
                  {typeValidated && project.photobooth_type !== 'premium' && (
                    <span className="inline-block mt-2 px-4 py-1 bg-gray-400/80 text-white text-xs font-semibold rounded-full shadow">Verrouillé</span>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  {/* Optionally, add a badge or icon */}
                </div>
              </div>
            </div>
            {/* Bouton de validation */}
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
          {/* Colonne droite : encart explicatif */}
          <div>
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  {/* Icône IA/étoile */}
                  <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h5 className="text-sm font-bold text-indigo-800 mb-1">À propos du Photobooth Premium IA</h5>
                  <div className="text-sm text-indigo-700">
                    {getPhotoboothTypeDescription(project.photobooth_type || 'premium')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export default PhotoboothTypeManager;
