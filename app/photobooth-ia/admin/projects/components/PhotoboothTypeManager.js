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
      case 'logo':
        return 'Logo Fusion';
      case 'coiffure': // <-- changé ici
        return 'Coiffure';
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
      // Ici, la mise à jour du type se fait dans la table 'projects' :
      // On met à jour la colonne 'photobooth_type' pour le projet courant
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
      case 'logo':
        return (
          <>
            <p className="mb-2">
              Le <span className="font-semibold text-indigo-700">Photobooth Logo Fusion</span> permet d'intégrer votre logo de manière créative&nbsp;:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>
                <span className="font-semibold">Intégration de logo</span> : Fusionnez votre logo avec des images pour un branding unique.
              </li>
              <li>
                <span className="font-semibold">Personnalisation avancée</span> : Ajustez la taille, la position et les effets de votre logo.
              </li>
              <li>
                <span className="font-semibold">Aperçu en temps réel</span> : Visualisez instantanément le rendu de votre logo sur les photos.
              </li>
            </ul>
            <div className="mt-3 text-xs text-indigo-600 italic">
              Idéal pour les marques, les entreprises et les événements souhaitant une forte identité visuelle.
            </div>
          </>
        );
      case 'coiffure': // <-- changé ici
        return (
          <>
            <p className="mb-2">
              Le <span className="font-semibold text-indigo-700">Photobooth Coiffure</span> permet de changer virtuellement de coupe et de couleur de cheveux&nbsp;:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>
                <span className="font-semibold">Changement de coupe de cheveux</span> : Essayez différentes coiffures en temps réel.
              </li>
              <li>
                <span className="font-semibold">Changement de teinte</span> : Modifiez la couleur de vos cheveux virtuellement.
              </li>
            </ul>
            <div className="mt-3 text-xs text-indigo-600 italic">
              Idéal pour des animations beauté, des essais de style et des expériences personnalisées.
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Set default type to premium if not already set
  if (!project.photobooth_type) {
    // Si le type n'est pas défini, on l'enregistre dans la base via updatePhotoboothType('premium')
    updatePhotoboothType('premium');
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 rounded-xl border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
            <span className="text-white font-semibold">5</span>
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

      {/* Message si le type n'est pas validé */}
      {!typeValidated && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 m-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                Sélectionnez et validez le type de photobooth pour continuer la configuration de votre projet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Type validé avec succès */}
      {typeValidated && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Type de photobooth <span className="font-semibold">{getPhotoboothTypeLabel(project.photobooth_type)}</span> validé avec succès. Ce choix est définitif et ne peut plus être modifié.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Galerie des types avec design moderne */}
      <div className="m-6">
        <div className="bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 rounded-2xl p-8 shadow-2xl border border-indigo-700/30 relative overflow-visible">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-bold text-white flex items-center drop-shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
              Types de Photobooth disponibles
            </h4>
            {typeValidated && (
              <div className="inline-flex items-center px-4 py-2 border rounded-full border-transparent text-sm font-medium shadow-sm text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Type validé et verrouillé
              </div>
            )}
          </div>

          {/* Grid des types de photobooth */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-7">
            {/* CARTE SIMPLE */}
            <div className={`
              group relative bg-gradient-to-br from-gray-800 via-indigo-800 to-purple-800 rounded-2xl overflow-visible shadow-xl border-2 border-transparent transition-all duration-300 transform hover:-translate-y-2 hover:scale-105
              ${project.photobooth_type === 'simple' ? 'border-blue-500 -translate-y-2 scale-105' : 'hover:border-blue-500'}
              ${typeValidated && project.photobooth_type !== 'simple' ? 'opacity-60 grayscale cursor-not-allowed' : !typeValidated ? 'cursor-pointer' : ''}
            `}>
              {/* Glow effect */}
              <div className={`
                absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/30 via-blue-500/20 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-0
                ${project.photobooth_type === 'simple' ? 'opacity-100' : ''}
              `}></div>
              
              <div 
                onClick={() => !typeValidated && updatePhotoboothType('simple')}
                className="relative z-10 flex flex-col h-full"
                style={{minHeight: "500px"}}
              >
                <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden rounded-t-2xl border-b border-indigo-700/40">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/carnival_ice_mask.jpg')"}}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
                  
                  {/* Icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full 
                      bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg
                      transform transition-transform duration-300 group-hover:scale-110
                      ${project.photobooth_type === 'simple' ? 'scale-110' : ''}
                    `}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between p-4">
                  <div>
                    <h5 className={`
                      font-bold text-white mb-2 text-lg
                      transform transition-all duration-300 group-hover:text-blue-300
                      ${project.photobooth_type === 'simple' ? 'text-blue-300' : ''}
                    `}>Simple</h5>
                    
                    {/* Description détaillée */}
                    <div className="text-gray-300 text-xs mb-4 space-y-2">
                      <p className="font-medium text-blue-200">Le Photobooth Simple propose une expérience classique :</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><span className="font-medium">Prise de photo instantanée</span> : Capturez des souvenirs en toute simplicité.</li>
                        <li><span className="font-medium">Interface intuitive</span> : Facile à utiliser pour tous les publics.</li>
                        <li><span className="font-medium">Sans intelligence artificielle</span> : Aucune modification ou effet IA, photo brute.</li>
                      </ul>
                      <div className="text-[10px] text-blue-300 italic mt-2 border-l-2 border-blue-400 pl-2">
                        Idéal pour des événements traditionnels, des animations rapides et une expérience directe.
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40">
                        classique
                      </span>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-500/20 text-green-200 border border-green-400/40">
                        simple
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    {project.photobooth_type === 'simple' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-blue-200 bg-gradient-to-r from-blue-600/80 to-blue-500/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Sélectionné
                      </span>
                    )}
                    
                    {typeValidated && project.photobooth_type !== 'simple' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 bg-gray-700/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                        </svg>
                        Verrouillé
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bottom highlight for selected */}
                {project.photobooth_type === 'simple' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
                )}
              </div>
            </div>
            
            {/* CARTE PREMIUM */}
            <div className={`
              group relative bg-gradient-to-br from-gray-800 via-indigo-800 to-purple-800 rounded-2xl overflow-visible shadow-xl border-2 border-transparent transition-all duration-300 transform hover:-translate-y-2 hover:scale-105
              ${project.photobooth_type === 'premium' ? 'border-indigo-500 -translate-y-2 scale-105' : 'hover:border-indigo-500'}
              ${typeValidated && project.photobooth_type !== 'premium' ? 'opacity-60 grayscale cursor-not-allowed' : !typeValidated ? 'cursor-pointer' : ''}
            `}>
              {/* Glow effect */}
              <div className={`
                absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-0
                ${project.photobooth_type === 'premium' ? 'opacity-100' : ''}
              `}></div>
              
              <div 
                onClick={() => !typeValidated && updatePhotoboothType('premium')}
                className="relative z-10 flex flex-col h-full"
                style={{minHeight: "500px"}}
              >
                <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden rounded-t-2xl border-b border-indigo-700/40">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/makeup_pastel_clown.jpg')"}}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
                  
                  {/* Premium badge */}
                  <div className="absolute top-3 right-3 z-20">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full blur-sm opacity-70 animate-pulse"></div>
                      <span className="relative flex items-center justify-center px-3 py-1 text-xs font-bold text-gray-900 bg-gradient-to-r from-yellow-300 to-yellow-200 rounded-full border border-yellow-400/50">
                        PREMIUM
                      </span>
                    </div>
                  </div>
                  
                  {/* Icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full 
                      bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg
                      transform transition-transform duration-300 group-hover:scale-110
                      ${project.photobooth_type === 'premium' ? 'scale-110' : ''}
                    `}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between p-4">
                  <div>
                    <h5 className={`
                      font-bold text-white mb-2 text-lg
                      transform transition-all duration-300 group-hover:text-indigo-300
                      ${project.photobooth_type === 'premium' ? 'text-indigo-300' : ''}
                    `}>Premium</h5>
                    
                    {/* Description détaillée */}
                    <div className="text-gray-300 text-xs mb-4 space-y-2">
                      <p className="font-medium text-indigo-200">Le Photobooth Premium IA offre une expérience enrichie grâce à l'intelligence artificielle :</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><span className="font-medium">Génération d'images IA</span> : Créez des photos uniques et créatives.</li>
                        <li><span className="font-medium">Changement de coupe de cheveux</span> : Essayez virtuellement différentes coiffures.</li>
                        <li><span className="font-medium">Amélioration de la qualité</span> : L'IA optimise automatiquement vos photos.</li>
                        <li><span className="font-medium">Effets avancés</span> : Ajoutez des filtres artistiques et des fonds dynamiques.</li>
                        <li><span className="font-medium">Personnalisation poussée</span> : Intégrez logos, textes ou cadres personnalisés.</li>
                      </ul>
                      <div className="text-[10px] text-indigo-300 italic mt-2 border-l-2 border-indigo-400 pl-2">
                        Idéal pour des événements innovants, des animations interactives et pour offrir une expérience mémorable.
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40">
                        IA
                      </span>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/40">
                        premium
                      </span>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-400/20 text-yellow-100 border border-yellow-400/40">
                        avancé
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    {project.photobooth_type === 'premium' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-indigo-200 bg-gradient-to-r from-indigo-600/80 to-purple-500/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Sélectionné
                      </span>
                    )}
                    
                    {typeValidated && project.photobooth_type !== 'premium' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 bg-gray-700/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                        </svg>
                        Verrouillé
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bottom highlight for selected */}
                {project.photobooth_type === 'premium' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-500"></div>
                )}
              </div>
            </div>
            
            {/* CARTE BOOMERANG */}
            <div className={`
              group relative bg-gradient-to-br from-gray-800 via-indigo-800 to-purple-800 rounded-2xl overflow-visible shadow-xl border-2 border-transparent transition-all duration-300 transform hover:-translate-y-2 hover:scale-105
              ${project.photobooth_type === 'boomerang' ? 'border-pink-500 -translate-y-2 scale-105' : 'hover:border-pink-500'}
              ${typeValidated && project.photobooth_type !== 'boomerang' ? 'opacity-60 grayscale cursor-not-allowed' : !typeValidated ? 'cursor-pointer' : ''}
            `}>
              {/* Glow effect */}
              <div className={`
                absolute -inset-1 rounded-2xl bg-gradient-to-br from-pink-500/30 via-pink-500/20 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-0
                ${project.photobooth_type === 'boomerang' ? 'opacity-100' : ''}
              `}></div>
              
              <div 
                onClick={() => !typeValidated && updatePhotoboothType('boomerang')}
                className="relative z-10 flex flex-col h-full"
                style={{minHeight: "500px"}}
              >
                <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden rounded-t-2xl border-b border-indigo-700/40">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/gif_sample.jpg')"}}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
                  
                  {/* Icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full 
                      bg-gradient-to-tr from-pink-600 to-orange-400 shadow-lg
                      transform transition-transform duration-300 group-hover:scale-110
                      ${project.photobooth_type === 'boomerang' ? 'scale-110' : ''}
                    `}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between p-4">
                  <div>
                    <h5 className={`
                      font-bold text-white mb-2 text-lg
                      transform transition-all duration-300 group-hover:text-pink-300
                      ${project.photobooth_type === 'boomerang' ? 'text-pink-300' : ''}
                    `}>Boomerang</h5>
                    
                    {/* Description détaillée */}
                    <div className="text-gray-300 text-xs mb-4 space-y-2">
                      <p className="font-medium text-pink-200">Le Photobooth Boomerang propose une expérience animée dynamique :</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><span className="font-medium">Courte vidéo aller-retour</span> : Captez un mouvement qui s'anime en boucle.</li>
                        <li><span className="font-medium">Effet d'animation inversée</span> : La séquence joue en avant puis en arrière automatiquement.</li>
                        <li><span className="font-medium">Durée optimale</span> : Animation fluide de quelques secondes, idéale pour les réseaux sociaux.
                        </li>
                        <li><span className="font-medium">Sans IA ni effets avancés</span> : Animation naturelle, sans modification algorithmique.</li>
                      </ul>
                      <div className="text-[10px] text-pink-300 italic mt-2 border-l-2 border-pink-400 pl-2">
                        Idéal pour capturer des moments expressifs, des gestes amusants et créer des souvenirs hypnotiques.
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-pink-500/20 text-pink-200 border border-pink-400/40">
                        vidéo
                      </span>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-500/20 text-orange-200 border border-orange-400/40">
                        animation
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    {project.photobooth_type === 'boomerang' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-pink-200 bg-gradient-to-r from-pink-600/80 to-orange-400/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Sélectionné
                      </span>
                    )}
                    
                    {typeValidated && project.photobooth_type !== 'boomerang' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 bg-gray-700/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                        </svg>
                        Verrouillé
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bottom highlight for selected */}
                {project.photobooth_type === 'boomerang' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-600 to-orange-400"></div>
                )}
              </div>
            </div>

            {/* CARTE LOGO FUSION */}
            <div className={`
              group relative bg-gradient-to-br from-gray-800 via-indigo-800 to-purple-800 rounded-2xl overflow-visible shadow-xl border-2 border-transparent transition-all duration-300 transform hover:-translate-y-2 hover:scale-105
              ${project.photobooth_type === 'logo' ? 'border-red-500 -translate-y-2 scale-105' : 'hover:border-red-500'}
              ${typeValidated && project.photobooth_type !== 'logo' ? 'opacity-60 grayscale cursor-not-allowed' : !typeValidated ? 'cursor-pointer' : ''}
            `}>
              {/* Glow effect */}
              <div className={`
                absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-500/30 via-red-500/20 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-0
                ${project.photobooth_type === 'logo' ? 'opacity-100' : ''}
              `}></div>
              
              <div 
                onClick={() => !typeValidated && updatePhotoboothType('logo')}
                className="relative z-10 flex flex-col h-full"
                style={{minHeight: "500px"}}
              >
                <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden rounded-t-2xl border-b border-indigo-700/40">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/logo_fusion_sample.jpg')"}}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
                  
                  {/* Icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full 
                      bg-gradient-to-tr from-red-600 to-orange-400 shadow-lg
                      transform transition-transform duration-300 group-hover:scale-110
                      ${project.photobooth_type === 'logo' ? 'scale-110' : ''}
                    `}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between p-4">
                  <div>
                    <h5 className={`
                      font-bold text-white mb-2 text-lg
                      transform transition-all duration-300 group-hover:text-red-300
                      ${project.photobooth_type === 'logo' ? 'text-red-300' : ''}
                    `}>Logo Fusion</h5>
                    
                    {/* Description détaillée */}
                    <div className="text-gray-300 text-xs mb-4 space-y-2">
                      <p className="font-medium text-red-200">Le Photobooth Logo Fusion permet d'intégrer votre logo de manière créative :</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><span className="font-medium">Intégration de logo</span> : Fusionnez votre logo avec des images pour un branding unique.</li>
                        <li><span className="font-medium">Personnalisation avancée</span> : Ajustez la taille, la position et les effets de votre logo.</li>
                        <li><span className="font-medium">Aperçu en temps réel</span> : Visualisez instantanément le rendu de votre logo sur les photos.</li>
                      </ul>
                      <div className="text-[10px] text-red-300 italic mt-2 border-l-2 border-red-400 pl-2">
                        Idéal pour les marques, les entreprises et les événements souhaitant une forte identité visuelle.
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/20 text-red-200 border border-red-400/40">
                        logo
                      </span>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-500/20 text-orange-200 border border-orange-400/40">
                        branding
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    {project.photobooth_type === 'logo' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-red-200 bg-gradient-to-r from-red-600/80 to-orange-400/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Sélectionné
                      </span>
                    )}
                    
                    {typeValidated && project.photobooth_type !== 'logo' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 bg-gray-700/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                        </svg>
                        Verrouillé
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bottom highlight for selected */}
                {project.photobooth_type === 'logo' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-orange-400"></div>
                )}
              </div>
            </div>

            {/* CARTE COIFFURE */}
            <div className={`
              group relative bg-gradient-to-br from-gray-800 via-indigo-800 to-purple-800 rounded-2xl overflow-visible shadow-xl border-2 border-transparent transition-all duration-300 transform hover:-translate-y-2 hover:scale-105
              ${project.photobooth_type === 'coiffure' ? 'border-pink-400 -translate-y-2 scale-105' : 'hover:border-pink-400'}
              ${typeValidated && project.photobooth_type !== 'coiffure' ? 'opacity-60 grayscale cursor-not-allowed' : !typeValidated ? 'cursor-pointer' : ''}
            `}>
              <div className={`
                absolute -inset-1 rounded-2xl bg-gradient-to-br from-pink-400/30 via-pink-400/20 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-0
                ${project.photobooth_type === 'coiffure' ? 'opacity-100' : ''}
              `}></div>
              
              <div 
                onClick={() => !typeValidated && updatePhotoboothType('coiffure')}
                className="relative z-10 flex flex-col h-full"
                style={{minHeight: "500px"}}
              >
                <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden rounded-t-2xl border-b border-indigo-700/40">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{backgroundImage: "url('https://leeveostockage.s3.eu-west-3.amazonaws.com/style/hairstyle_collection.jpg')"}}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-900/90"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full 
                      bg-gradient-to-tr from-pink-400 to-indigo-400 shadow-lg
                      transform transition-transform duration-300 group-hover:scale-110
                      ${project.photobooth_type === 'coiffure' ? 'scale-110' : ''}
                    `}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between p-4">
                  <div>
                    <h5 className={`
                      font-bold text-white mb-2 text-lg
                      transform transition-all duration-300 group-hover:text-pink-300
                      ${project.photobooth_type === 'coiffure' ? 'text-pink-300' : ''}
                    `}>Coiffure</h5>
                    
                    {/* Description détaillée */}
                    <div className="text-gray-300 text-xs mb-4 space-y-2">
                      <p className="font-medium text-pink-200">Changement de coupe et de couleur de cheveux :</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><span className="font-medium">Changement de coupe de cheveux</span> : Essayez différentes coiffures en temps réel.</li>
                        <li><span className="font-medium">Changement de teinte</span> : Modifiez la couleur de vos cheveux virtuellement.</li>
                      </ul>
                      <div className="text-[10px] text-pink-300 italic mt-2 border-l-2 border-pink-400 pl-2">
                        Idéal pour des animations beauté, des essais de style et des expériences personnalisées.
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-pink-500/20 text-pink-200 border border-pink-400/40">
                        coiffure
                      </span>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40">
                        couleur
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    {project.photobooth_type === 'coiffure' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-pink-200 bg-gradient-to-r from-pink-600/80 to-indigo-400/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Sélectionné
                      </span>
                    )}
                    
                    {typeValidated && project.photobooth_type !== 'coiffure' && (
                      <span className="w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 bg-gray-700/80 shadow-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                        </svg>
                        Verrouillé
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bottom highlight for selected */}
                {project.photobooth_type === 'coiffure' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-indigo-400"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Supprimer les description panels car maintenant intégrées dans les cartes */}

        {/* Validation button */}
        {!typeValidated && project && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleValidatePhotoboothType}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors shadow-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
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
