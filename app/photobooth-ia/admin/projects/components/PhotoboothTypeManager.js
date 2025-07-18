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

  // Ajout du type boomerang dans le label
  const getPhotoboothTypeLabel = (type) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'simple':
        return 'Simple';
      case 'bommerang':
        return 'Boomerang';
      default:
        return 'Premium';
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
      setSuccess('validé avec succès. Le type ne peut plus être modifié.');
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

  // Ajout de la description pour boomerang
  const getPhotoboothTypeDescription = (type) => {
    switch (type) {
      case 'premium':
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
      case 'simple':
        return (
          <>
            <p className="mb-2">
              Le <span className="font-semibold text-indigo-700">Photobooth Simple</span> propose une expérience classique&nbsp;:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>
                <span className="font-semibold">Prise de photo instantanée</span> : Capturez des souvenirs en toute simplicité.
              </li>
              <li>
                <span className="font-semibold">Interface intuitive</span> : Facile à utiliser pour tous les publics.
              </li>
              <li>
                <span className="font-semibold">Sans intelligence artificielle</span> : Aucune modification ou effet IA, photo brute.
              </li>
            </ul>
            <div className="mt-3 text-xs text-indigo-600 italic">
              Idéal pour des événements traditionnels, des animations rapides et une expérience directe.
            </div>
          </>
        );
     case 'boomerang':
        return (
          <>
            <p className="mb-2">
              Le <span className="font-semibold text-indigo-700">Photobooth Boomerang</span> propose une expérience animée dynamique&nbsp;:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>
                <span className="font-semibold">Courte vidéo aller-retour</span> : Captez un mouvement qui s'anime en boucle.
              </li>
              <li>
                <span className="font-semibold">Effet d'animation inversée</span> : La séquence joue en avant puis en arrière automatiquement.
              </li>
              <li>
                <span className="font-semibold">Durée optimale</span> : Animation fluide de quelques secondes, idéale pour les réseaux sociaux.
              </li>
              <li>
                <span className="font-semibold">Sans IA ni effets avancés</span> : Animation naturelle, sans modification algorithmique.
              </li>
            </ul>
            <div className="mt-3 text-xs text-indigo-600 italic">
              Idéal pour capturer des moments expressifs, des gestes amusants et créer des souvenirs hypnotiques.
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Set default type to premium if not already set
  if (!project.photobooth_type) {
    updatePhotoboothType('premium');
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 rounded-xl border-b border-gray-200">
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

        {/* Nouvelle disposition en trois colonnes - avec style mis à jour */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARTE SIMPLE */}
          <div className={`
            group relative bg-gray-900 rounded-2xl overflow-hidden shadow-xl transform transition-all duration-300
            ${project.photobooth_type === 'simple' ? 'ring-4 ring-blue-400/70 scale-[1.02]' : ''}
            ${typeValidated && project.photobooth_type !== 'simple' ? 'opacity-60 grayscale' : 'hover:scale-[1.03]'}
          `}>
            {/* Background image with overlay */}
            <div className="absolute inset-0 w-full h-full">
              <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/carnival_ice_mask.jpg')"}}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
            </div>
            
            {/* Glow effect on hover */}
            <div className={`
              absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/30 via-blue-500/20 to-transparent 
              blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
              ${project.photobooth_type === 'simple' ? 'opacity-100' : ''}
            `}></div>
            
            {/* Content container */}
            <div 
              onClick={() => !typeValidated && updatePhotoboothType('simple')}
              className={`
                relative z-10 p-6 h-full flex flex-col items-center justify-center text-center
                ${!typeValidated ? 'cursor-pointer' : project.photobooth_type !== 'simple' ? 'cursor-not-allowed' : ''}
              `}
              style={{minHeight: "340px"}}
            >
              {/* Icon */}
              <div className={`
                inline-flex items-center justify-center w-16 h-16 rounded-full 
                bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg mb-4
                transform transition-transform duration-300 group-hover:scale-110
                ${project.photobooth_type === 'simple' ? 'scale-110' : ''}
              `}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className={`
                text-2xl font-extrabold text-white mb-3 tracking-tight
                transform transition-all duration-300 group-hover:scale-110 group-hover:text-blue-300
                ${project.photobooth_type === 'simple' ? 'text-blue-300 scale-110' : ''}
              `}>Simple</h3>
              
              {/* Description */}
              <p className="text-gray-300 mb-6 text-sm max-w-xs">
                Prise de photo classique, sans IA ni effets avancés. 
                <span className="hidden sm:inline">Interface intuitive, facile à utiliser pour tous les publics.</span>
              </p>
              
              {/* Status indicator */}
              {project.photobooth_type === 'simple' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  Sélectionné
                </span>
              )}
              
              {typeValidated && project.photobooth_type !== 'simple' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  Verrouillé
                </span>
              )}
              
              {/* Bottom highlight for selected */}
              {project.photobooth_type === 'simple' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
              )}
            </div>
          </div>
          
          {/* CARTE PREMIUM */}
          <div className={`
            group relative bg-gray-900 rounded-2xl overflow-hidden shadow-xl transform transition-all duration-300
            ${project.photobooth_type === 'premium' ? 'ring-4 ring-indigo-500/70 scale-[1.02]' : ''}
            ${typeValidated && project.photobooth_type !== 'premium' ? 'opacity-60 grayscale' : 'hover:scale-[1.03]'}
          `}>
            {/* Background image with overlay */}
            <div className="absolute inset-0 w-full h-full">
              <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/makeup_pastel_clown.jpg')"}}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
            </div>
            
            {/* Glow effect on hover */}
            <div className={`
              absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-transparent 
              blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
              ${project.photobooth_type === 'premium' ? 'opacity-100' : ''}
            `}></div>
            
            {/* Content container */}
            <div 
              onClick={() => !typeValidated && updatePhotoboothType('premium')}
              className={`
                relative z-10 p-6 h-full flex flex-col items-center justify-center text-center
                ${!typeValidated ? 'cursor-pointer' : project.photobooth_type !== 'premium' ? 'cursor-not-allowed' : ''}
              `}
              style={{minHeight: "340px"}}
            >
              {/* Shiny Badge for Premium */}
              <div className="absolute top-4 right-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full blur-sm opacity-70 animate-pulse"></div>
                  <span className="relative flex items-center justify-center px-3 py-1 text-xs font-bold text-gray-900 bg-gradient-to-r from-yellow-300 to-yellow-200 rounded-full border border-yellow-400/50">
                    PREMIUM
                  </span>
                </div>
              </div>
              
              {/* Icon */}
              <div className={`
                inline-flex items-center justify-center w-16 h-16 rounded-full 
                bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg mb-4
                transform transition-transform duration-300 group-hover:scale-110
                ${project.photobooth_type === 'premium' ? 'scale-110' : ''}
              `}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className={`
                text-2xl font-extrabold text-white mb-3 tracking-tight
                transform transition-all duration-300 group-hover:scale-110 group-hover:text-indigo-300
                ${project.photobooth_type === 'premium' ? 'text-indigo-300 scale-110' : ''}
              `}>Premium</h3>
              
              {/* Description */}
              <p className="text-gray-300 mb-6 text-sm max-w-xs">
                Expérience IA enrichie, effets avancés, personnalisation poussée. 
                <span className="hidden sm:inline">Idéal pour des événements innovants et interactifs.</span>
              </p>
              
              {/* Status indicator */}
              {project.photobooth_type === 'premium' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-500 text-white shadow-lg">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  Sélectionné
                </span>
              )}
              
              {typeValidated && project.photobooth_type !== 'premium' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  Verrouillé
                </span>
              )}
              
              {/* Bottom highlight for selected */}
              {project.photobooth_type === 'premium' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-500"></div>
              )}
            </div>
          </div>
          
          {/* CARTE BOOMERANG */}
          <div className={`
            group relative bg-gray-900 rounded-2xl overflow-hidden shadow-xl transform transition-all duration-300
            ${project.photobooth_type === 'boomerang' ? 'ring-4 ring-pink-500/70 scale-[1.02]' : ''}
            ${typeValidated && project.photobooth_type !== 'boomerang' ? 'opacity-60 grayscale' : 'hover:scale-[1.03]'}
          `}>
            {/* Background image with overlay */}
            <div className="absolute inset-0 w-full h-full">
              <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/gif_sample.jpg')"}}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
            </div>
            
            {/* Glow effect on hover */}
            <div className={`
              absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/30 via-pink-500/20 to-transparent 
              blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
              ${project.photobooth_type === 'boomerang' ? 'opacity-100' : ''}
            `}></div>
            
            {/* Content container */}
            <div 
              onClick={() => !typeValidated && updatePhotoboothType('boomerang')}
              className={`
                relative z-10 p-6 h-full flex flex-col items-center justify-center text-center
                ${!typeValidated ? 'cursor-pointer' : project.photobooth_type !== 'boomerang' ? 'cursor-not-allowed' : ''}
              `}
              style={{minHeight: "340px"}}
            >
              {/* Icon */}
              <div className={`
                inline-flex items-center justify-center w-16 h-16 rounded-full 
                bg-gradient-to-tr from-pink-600 to-orange-400 shadow-lg mb-4
                transform transition-transform duration-300 group-hover:scale-110
                ${project.photobooth_type === 'boomerang' ? 'scale-110' : ''}
              `}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className={`
                text-2xl font-extrabold text-white mb-3 tracking-tight
                transform transition-all duration-300 group-hover:scale-110 group-hover:text-pink-300
                ${project.photobooth_type === 'boomerang' ? 'text-pink-300 scale-110' : ''}
              `}>Boomerang</h3>
              
              {/* Description */}
              <p className="text-gray-300 mb-6 text-sm max-w-xs">
                Effet vidéo aller-retour en boucle. 
                <span className="hidden sm:inline">Idéal pour capturer des moments expressifs et créer des souvenirs animés.</span>
              </p>
              
              {/* Status indicator */}
              {project.photobooth_type === 'boomerang' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-pink-600 to-orange-400 text-white shadow-lg">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  Sélectionné
                </span>
              )}
              
              {typeValidated && project.photobooth_type !== 'boomerang' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  Verrouillé
                </span>
              )}
              
              {/* Bottom highlight for selected */}
              {project.photobooth_type === 'boomerang' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-600 to-orange-400"></div>
              )}
            </div>
          </div>
        </div>

        {/* Description panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <div className="ml-3">
                <h5 className="text-sm font-bold text-blue-800 mb-1">À propos du Photobooth Simple</h5>
                <div className="text-sm text-blue-700">
                  {getPhotoboothTypeDescription('simple')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-3">
                <h5 className="text-sm font-bold text-indigo-800 mb-1">À propos du Photobooth Premium IA</h5>
                <div className="text-sm text-indigo-700">
                  {getPhotoboothTypeDescription('premium')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-pink-50 border-l-4 border-pink-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-pink-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <h5 className="text-sm font-bold text-pink-800 mb-1">À propos du Photobooth Boomerang</h5>
                <div className="text-sm text-pink-700">
                  {getPhotoboothTypeDescription('boomerang')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation button */}
        {!typeValidated && project && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleValidatePhotoboothType}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors shadow-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Valider le type de photobooth
            </button>
          </div>
        )}
        
        <p className="mt-4 text-sm text-gray-500 text-center">
          Type sélectionné: <span className="font-medium text-indigo-600">{getPhotoboothTypeLabel(project.photobooth_type || 'premium')}</span>
          {typeValidated && <span className="text-orange-500 ml-2 font-medium">Ce choix est définitif et ne peut plus être modifié.</span>}
        </p>
      </div>
    </div>
  );
};




export default PhotoboothTypeManager;
