'use client'

import { useEffect, useState } from 'react'

export default function GalleryPage() {
  const [videos, setVideos] = useState<string[]>([])
  const [mergedVideo, setMergedVideo] = useState<string | null>(null)
  const [finalVideo, setFinalVideo] = useState<string | null>(null)
  const [scrollVideo, setScrollVideo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [leftColumnValidated, setLeftColumnValidated] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    const fetchVideos = async () => {
      const res = await fetch('/api/gallery')
      const data = await res.json()
      setVideos(data.videos || [])
    }

    fetchVideos()
  }, [])

  const handleMerge = async () => {
    setLoading(true)
    setStatus('🛠️ Étape 1/3: Montage en cours...')
    try {
      // Corrige l'URL pour pointer vers la bonne API route (pages/api)
      const res = await fetch('/api/merge-videos')
      const contentType = res.headers.get('content-type')
      if (!res.ok) {
        setStatus('❌ Erreur serveur (HTTP ' + res.status + ')')
        setLoading(false)
        return
      }
      if (!contentType || !contentType.includes('application/json')) {
        setStatus('❌ Réponse inattendue du serveur')
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.video) {
        setMergedVideo(data.video)
        setCurrentStep(2)
        setStatus('✅ Étape 1/3 terminée: Montage vidéo créé')
      } else {
        setStatus('❌ Erreur fusion')
      }
    } catch (err) {
      console.error('Erreur merge:', err)
      setStatus('❌ Échec du montage')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBackground = async () => {
    setLoading(true)
    setStatus('🎨 Étape 2/3: Ajout du fond en cours...')
    try {
      const res = await fetch('/api/add-background')
      const data = await res.json()
      if (data.video) {
        setFinalVideo(data.video)
        setCurrentStep(3)
        setStatus('✅ Étape 2/3 terminée: Fond ajouté avec succès')
      } else {
        setStatus('❌ Erreur lors de l&apos;ajout du fond')
      }
    } catch (err) {
      console.error('Erreur ajout background:', err)
      setStatus('❌ Échec ajout fond')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateScroll = async () => {
    setLoading(true)
    setStatus('➡️ Étape 3/3: Génération du scroll horizontal...')
    try {
      const res = await fetch('/api/animate-scroll')
      const contentType = res.headers.get('content-type')
      if (!res.ok) {
        setStatus('❌ Erreur serveur (HTTP ' + res.status + ')')
        setLoading(false)
        return
      }
      if (!contentType || !contentType.includes('application/json')) {
        setStatus('❌ Réponse inattendue du serveur')
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.video) {
        setScrollVideo(data.video)
        setStatus('✅ Étape 3/3 terminée: Scroll généré avec succès')
      } else {
        setStatus('❌ Échec scroll: ' + (data.error || 'Erreur inconnue'))
      }
    } catch (err) {
      console.error('Erreur scroll:', err)
      setStatus('❌ Erreur scroll')
    } finally {
      setLoading(false)
    }
  }

  const refreshVideos = () => {
    const fetchVideos = async () => {
      const res = await fetch('/api/gallery')
      const data = await res.json()
      setVideos(data.videos || [])
    }
    fetchVideos()
  }

  const handleValidation = () => {
    if (videos.length === 0) {
      alert('Aucune vidéo disponible. Veuillez d&apos;abord ajouter des vidéos.')
      return
    }
    setShowConfirmModal(true)
  }

  const confirmValidation = () => {
    setLeftColumnValidated(true)
    setShowConfirmModal(false)
  }

  const totalWidth = videos.length * 640

  return (
    <div className="max-w-full mx-auto p-6 relative">
      {/* Custom confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmer la validation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir valider les vidéos sélectionnées ? Cette action finalisera vos choix et vous ne pourrez plus les modifier par la suite.
            </p>
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmValidation}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirmer la validation
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Galerie des vidéos traitées</h1>
      </div>

      {/* Layout principal en deux colonnes */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* COLONNE GAUCHE: Sélection de vidéos */}
        <div className={`md:w-1/2 space-y-6 relative ${leftColumnValidated ? 'pointer-events-none' : ''}`}>
          {/* Overlay grisé sur la colonne gauche quand validée */}
          {leftColumnValidated && (
            <div className="absolute inset-0 bg-gray-200 bg-opacity-40 z-10 rounded-lg backdrop-blur-sm">
              <div className="flex h-full items-center justify-center">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <div className="flex items-center text-green-600 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Vidéos validées</span>
                  </div>
                  <p className="text-sm text-gray-600">Vous pouvez maintenant procéder à la génération des montages</p>
                </div>
              </div>
            </div>
          )}

          {/* Titre et description de la section gauche */}
          <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vidéos disponibles</h2>
            <p className="text-gray-700">
              Cette section affiche toutes les vidéos disponibles pour le montage. 
              Consultez-les avant de passer au processus de fusion et d&apos;animation.
            </p>
          </div>

          {/* Statistiques */}
          <section className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">Nombre de vidéos</p>
                <p className="text-3xl font-bold text-blue-700">{videos.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <p className="text-sm text-purple-800 font-medium">Largeur totale</p>
                <p className="text-3xl font-bold text-purple-700">{totalWidth} <span className="text-sm">px</span></p>
              </div>
            </div>
          </section>

          {/* Liste des vidéos */}
          <section className="p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Vidéos ({videos.length})</h2>
              <button
                onClick={refreshVideos}
                className="text-sm text-blue-600 flex items-center"
                title="Rafraîchir la liste"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualiser
              </button>
            </div>

            {videos.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-gray-500">Aucune vidéo disponible pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-2">
                {videos.map((file) => (
                  <div key={file} className="border rounded shadow-sm overflow-hidden bg-gray-50">
                    <div className="relative pt-[75%]"> {/* 4:3 aspect ratio */}
                      <video
                        src={`/uploads/${file}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        controls
                      />
                    </div>
                    <div className="p-2 text-center">
                      <p className="text-xs text-gray-500 truncate">{file}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bouton de validation */}
          {!leftColumnValidated && (
            <div className="p-6 bg-white rounded-lg shadow">
              <button
                onClick={handleValidation}
                disabled={videos.length === 0}
                className={`w-full py-4 rounded-lg font-medium text-lg transition-colors ${
                  videos.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valider et continuer
                </div>
                {videos.length > 0 && (
                  <p className="text-sm mt-1 font-normal">
                    {videos.length} vidéo{videos.length > 1 ? 's' : ''} disponible{videos.length > 1 ? 's' : ''}
                  </p>
                )}
              </button>
            </div>
          )}
        </div>

        {/* COLONNE DROITE: Processus de génération et résultats */}
        <div className={`md:w-1/2 space-y-6 relative ${!leftColumnValidated ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Message de validation nécessaire */}
          {!leftColumnValidated && (
            <div className="absolute right-0 top-20 transform z-10 bg-white p-4 rounded-lg shadow-lg m-4">
              <div className="flex items-center text-amber-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Validez d&apos;abord les vidéos</span>
              </div>
              <p className="text-sm text-gray-600">
                Confirmez les vidéos dans la colonne de gauche<br />puis cliquez sur &quot;Valider et continuer&quot;
              </p>
              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
                <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </div>
            </div>
          )}

          {/* Titre et description de la section droite */}
          <div className="bg-white border-l-4 border-green-500 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Traitement et génération</h2>
            <p className="text-gray-700">
              Suivez les 3 étapes du processus : fusionnez d&apos;abord les vidéos en un seul montage, 
              ajoutez ensuite un fond personnalisé, puis générez une animation avec défilement horizontal.
            </p>
          </div>

          {/* Processus en 3 étapes */}
          <section className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Processus de génération en 3 étapes</h2>
            
            <div className="flex items-center mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>1</div>
              <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>2</div>
              <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>3</div>
            </div>

            <div className="mb-6 space-y-3">
              <button
                onClick={handleMerge}
                disabled={loading || videos.length === 0 || !leftColumnValidated}
                className={`w-full px-4 py-3 rounded text-white ${
                  loading || videos.length === 0 || !leftColumnValidated 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : currentStep === 1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600'
                }`}
              >
                {currentStep > 1 ? '✅ ' : ''}Étape 1: Créer le montage vidéo
              </button>
              
              <button
                onClick={handleAddBackground}
                disabled={loading || !mergedVideo}
                className={`w-full px-4 py-3 rounded text-white ${
                  loading || !mergedVideo ? 'bg-gray-400 cursor-not-allowed' : currentStep === 2 ? 'bg-blue-600 hover:bg-blue-700' : currentStep > 2 ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                {currentStep > 2 ? '✅ ' : ''}Étape 2: Ajouter le fond
              </button>
              
              <button
                onClick={handleGenerateScroll}
                disabled={loading || !finalVideo}
                className={`w-full px-4 py-3 rounded text-white ${
                  loading || !finalVideo ? 'bg-gray-400 cursor-not-allowed' : currentStep === 3 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                }`}
              >
                {scrollVideo ? '✅ ' : ''}Étape 3: Générer le défilement
              </button>
            </div>
            
            {status && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                {status}
              </div>
            )}
          </section>

          {/* Résultats des étapes */}
          {mergedVideo && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Étape 1: Montage vidéo</h2>
              <div className="overflow-hidden rounded border border-gray-300 bg-gray-100">
                <video src={mergedVideo} controls className="w-full" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Cette vidéo montre les séquences fusionnées en un seul montage.
              </p>
            </section>
          )}

          {finalVideo && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Étape 2: Vidéo avec fond</h2>
              <div className="overflow-hidden rounded border border-gray-300 bg-gray-100">
                <video src={finalVideo} controls className="w-full" />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Cette vidéo montre le montage avec le fond personnalisé ajouté.
              </p>
            </section>
          )}

          {scrollVideo && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Étape 3: Animation avec défilement</h2>
              <div className="flex flex-col items-center">
                <div className="w-[660px] h-[500px] bg-gray-100 rounded-xl shadow-lg border-4 border-blue-300 flex items-center justify-center">
                  <video
                    src={scrollVideo}
                    className="w-[640px] h-[480px] rounded-md"
                    controls
                    autoPlay
                    loop
                    muted
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Cette vidéo montre l&apos;animation finale avec défilement horizontal.
              </p>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => window.open(`/player.html?src=${encodeURIComponent(scrollVideo!)}`, '_blank')}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  📺 Voir en plein écran
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
