'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Theme = {
  label: string
  file: string
}

type ProcessedImage = {
  path: string;
  originalDimensions?: { width: number; height: number };
  processedDimensions?: { width: number; height: number };
}

export default function PhotoWallPage() {
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [processingImages, setProcessingImages] = useState<boolean>(false)
  const [processingProgress, setProcessingProgress] = useState<string>('')
  const [uploadedOriginals, setUploadedOriginals] = useState<string[]>([]) // Nouvelles images originales
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])     // Images après traitement
  const [fresqueBlackBgUrl, setFresqueBlackBgUrl] = useState<string | null>(null)
  const [fresqueTransparentUrl, setFresqueTransparentUrl] = useState<string | null>(null)
  const [fresqueVideoUrl, setFresqueVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [status, setStatus] = useState<string | null>(null)
  const [themeOptions, setThemeOptions] = useState<Theme[]>([])
  const [theme, setTheme] = useState<Theme | null>(null)
  const [overlap, setOverlap] = useState<number>(-150)
  const [totalWidth, setTotalWidth] = useState<number>(0)
  const [leftColumnValidated, setLeftColumnValidated] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const IMAGE_WIDTH = 640
  const effectiveWidth = selectedPhotos.length * (IMAGE_WIDTH + overlap)
  const totalFresqueWidth = effectiveWidth * 2
  const animationDuration = Math.max(10, totalFresqueWidth / 100)

  const fetchPhotos = async () => {
    try {
      const res = await fetch('/api/photo-gallery')
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (err) {
      console.error('Error fetching photos:', err)
    }
  }

  useEffect(() => {
    fetchPhotos()
  }, [])

  useEffect(() => {
    const fetchThemes = async () => {
      const res = await fetch('/api/fresque-themes')
      const data = await res.json()
      if (Array.isArray(data.themes)) {
        setThemeOptions(data.themes)
        setTheme(data.themes[0] || null)
      }
    }
    fetchThemes()
  }, [])

  const togglePhoto = (src: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(src) ? prev.filter((p) => p !== src) : [...prev, src]
    )
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    
    setProcessingImages(true)
    setStatus('🔄 Téléchargement des images...')
    
    // First, upload the files
    const formData = new FormData()
    Array.from(files).forEach((file) => formData.append('files', file))
    
    try {
      const res = await fetch('/api/telechargement-image', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        setStatus('❌ Erreur lors du téléchargement')
        setProcessingImages(false)
        return
      }
      
      const data = await res.json()
      console.log('Réponse upload:', data) // Afficher la réponse complète pour le déboggage
      
      const uploadedFiles = Array.isArray(data.uploaded) ? data.uploaded : []
      
      if (uploadedFiles.length === 0) {
        setStatus('❌ Aucun fichier téléchargé')
        setProcessingImages(false)
        return
      }

      // Conserver les images originales pour comparaison
      setUploadedOriginals(uploadedFiles)
      setStatus(`✅ ${uploadedFiles.length} images téléchargées avec succès`)
      
      // Process each image to remove background
      setStatus(`🔍 Traitement des images pour supprimer l'arrière-plan (0/${uploadedFiles.length})...`)
      
      const processed: ProcessedImage[] = [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        const imagePath = uploadedFiles[i]
        setProcessingProgress(`${i + 1}/${uploadedFiles.length}`)
        setStatus(`🔍 Traitement des images pour supprimer l'arrière-plan (${i + 1}/${uploadedFiles.length})...`)
        
        // Extract filename from path
        const filename = imagePath.split('/').pop()
        console.log(`Traitement de l'image ${i+1}/${uploadedFiles.length}: ${filename}`)
        
        try {
          // Call the background removal API
          const bgRemovalRes = await fetch('/api/fal/remove-bg-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename }),
          })
          
          const bgData = await bgRemovalRes.json()
          console.log('Réponse remove-bg-photo:', bgData)
          
          if (bgRemovalRes.ok) {
            if (bgData.videoPath || bgData.imagePath) {
              // Add the processed image path to our list with dimensions
              const processedPath = bgData.videoPath || bgData.imagePath;
              processed.push({
                path: processedPath,
                originalDimensions: bgData.originalDimensions,
                processedDimensions: bgData.processedDimensions
              });
              console.log(`✅ Image traitée avec succès: ${processedPath}`)
            } else {
              console.error('Pas de chemin d\'image/vidéo retourné dans la réponse')
            }
          } else {
            console.error('Erreur dans la réponse remove-bg:', bgData.error)
          }
        } catch (err) {
          console.error(`Erreur lors du traitement de l'image ${filename}:`, err)
        }
      }
      
      // Mettre à jour l'état avec les images traitées
      setProcessedImages(processed)
      
      // Add the processed images to photos state
      if (processed.length > 0) {
        setPhotos((prev) => [...prev, ...processed.map(item => item.path)])
        setStatus(`✅ ${processed.length}/${uploadedFiles.length} images traitées avec arrière-plan supprimé`)
        
        // Refresh the photo gallery to ensure all images are included
        fetchPhotos()
      } else {
        setStatus(`⚠️ Aucune image n'a pu être traitée correctement`)
      }
      
    } catch (err) {
      console.error('Error during upload and processing:', err)
      setStatus('❌ Erreur lors du traitement des images')
    } finally {
      setProcessingImages(false)
      setProcessingProgress('')
    }
  }

  // ÉTAPE 1: Génération de la fresque PNG avec fond noir
  const handleGenerateBlackBgFresque = async () => {
    if (selectedPhotos.length === 0) {
      setStatus('❌ Aucune image sélectionnée')
      return
    }

    setLoading(true)
    setStatus('🧱 Étape 1/3: Génération de la fresque avec fond noir...')
    
    try {
      const res = await fetch('/api/photos-animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: selectedPhotos, 
          overlap, 
          theme, 
          step: 1 
        }),
      })
      
      const data = await res.json()
      
      if (data.error) {
        setStatus('❌ Erreur étape 1: ' + data.error)
        return
      }
      
      if (data.blackBgImage) {
        setFresqueBlackBgUrl(data.blackBgImage)
        setTotalWidth(data.totalWidth || 0)
        setCurrentStep(2)
        setStatus('✅ Étape 1/3 terminée: Fresque avec fond noir générée')
      } else {
        setStatus('❌ Erreur génération fresque avec fond noir')
      }
    } catch (err) {
      setStatus('❌ Erreur serveur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setLoading(false)
    }
  }

  // ÉTAPE 2: Conversion du fond noir en transparent
  const handleGenerateTransparentFresque = async () => {
    if (!fresqueBlackBgUrl) {
      setStatus('❌ Générez d\'abord la fresque avec fond noir (Étape 1)')
      return
    }

    setLoading(true)
    setStatus('🧱 Étape 2/3: Conversion du fond noir en transparent...')
    
    try {
      const res = await fetch('/api/photos-animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: selectedPhotos, 
          overlap, 
          theme, 
          step: 2,
          blackBgImage: fresqueBlackBgUrl
        }),
      })
      
      const data = await res.json()
      
      if (data.error) {
        setStatus('❌ Erreur étape 2: ' + data.error)
        return
      }
      
      if (data.transparentImage) {
        setFresqueTransparentUrl(data.transparentImage)
        setCurrentStep(3)
        setStatus('✅ Étape 2/3 terminée: Fresque avec transparence générée')
      } else {
        setStatus('❌ Erreur génération transparence')
      }
    } catch (err) {
      setStatus('❌ Erreur serveur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setLoading(false)
    }
  }

  // ÉTAPE 3: Génération de la vidéo avec défilement
  const handleGenerateVideo = async () => {
    if (!fresqueTransparentUrl) {
      setStatus('❌ Générez d\'abord la fresque transparente (Étape 2)')
      return
    }

    setLoading(true)
    setStatus('🧱 Étape 3/3: Génération de la vidéo avec défilement...')
    
    try {
      const res = await fetch('/api/photos-animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: selectedPhotos, 
          overlap, 
          theme, 
          step: 3,
          transparentImage: fresqueTransparentUrl
        }),
      })
      
      const data = await res.json()
      
      if (data.error) {
        setStatus('❌ Erreur étape 3: ' + data.error)
        return
      }
      
      if (data.video) {
        setFresqueVideoUrl(data.video)
        setStatus('✅ Étape 3/3 terminée: Vidéo avec défilement générée')
      } else {
        setStatus('❌ Erreur génération vidéo')
      }
    } catch (err) {
      setStatus('❌ Erreur serveur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setLoading(false)
    }
  }

  // Add a refresh button to manually reload the photo gallery
  const refreshPhotoGallery = () => {
    fetchPhotos()
  }

  const handleValidation = () => {
    if (selectedPhotos.length === 0) {
      alert('Veuillez sélectionner au moins une photo avant de valider.');
      return;
    }
    
    // Show custom modal instead of using window.confirm
    setShowConfirmModal(true);
  };

  const confirmValidation = () => {
    setLeftColumnValidated(true);
    setShowConfirmModal(false);
  };

  return (
    <div className="max-w-full mx-auto p-6 relative">
      {/* Custom confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmer la validation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir valider vos sélections ? Cette action finalisera vos choix et vous ne pourrez plus les modifier par la suite.
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
        <h1 className="text-2xl font-bold text-gray-900">Générateur de Fresque</h1>
      </div>

      {/* Layout principal en deux colonnes */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* COLONNE GAUCHE: Sélection et options */}
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
                    <span className="font-medium">Paramètres validés</span>
                  </div>
                  <p className="text-sm text-gray-600">Vous pouvez maintenant procéder à la génération de votre fresque</p>
                </div>
              </div>
            </div>
          )}

          {/* Titre et description de la section gauche */}
          <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Préparation de la fresque</h2>
            <p className="text-gray-700">
              Dans cette section, sélectionnez vos images, choisissez un fond et réglez le 
              chevauchement entre les photos. Pour une fresque harmonieuse, 
              assurez-vous de sélectionner des photos similaires en style et en composition.
              L&apos;ordre de sélection détermine l&apos;ordre d&apos;affichage dans la fresque.
            </p>
          </div>

          {/* Nouvelle section Photobooth */}
          <section className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Photobooth</h2>
            <p className="text-gray-700 mb-4">
              Prenez des photos instantanées avec votre webcam pour les ajouter à votre fresque.
              Les photos prises seront automatiquement disponibles dans votre galerie ci-dessous.
            </p>
            <Link 
              href="/fresque/photobooth" 
              target="_blank"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm flex items-center justify-center w-full md:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ouvrir le Photobooth
            </Link>

            {/* Ajout du QR code et de l'URL */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-700 mb-3">Partagez le Photobooth</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code */}
                <div className="relative p-2 bg-white border rounded shadow-sm">
                  <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/fresque/photobooth')}`}
                    alt="QR Code Photobooth" 
                    width={150} 
                    height={150}
                  />
                </div>

                {/* Instructions and URL */}
                <div className="flex-1">
                  <p className="text-gray-600 mb-3">
                    Scannez ce QR code avec votre téléphone pour accéder directement au photobooth,
                    ou partagez l&apos;URL ci-dessous:
                  </p>
                  
                  <div className="flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/fresque/photobooth` : ''}
                      className="flex-1 border rounded-l px-3 py-2 bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/fresque/photobooth`;
                        navigator.clipboard.writeText(url);
                        alert("URL copiée dans le presse-papier!");
                      }}
                      className="border border-l-0 rounded-r bg-gray-100 hover:bg-gray-200 px-3 py-2"
                      title="Copier l'URL"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Upload */}
          <section className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Importer vos images</h2>
            <p className="text-gray-700 mb-4">
              Si vous préférez utiliser des images existantes, vous pouvez les télécharger depuis votre ordinateur.
              Sélectionnez une ou plusieurs images à la fois ou glissez-déposez les fichiers directement.
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleUpload(e.dataTransfer.files)
              }}
              className="border-2 border-dashed border-gray-300 rounded p-6 text-center hover:bg-gray-50"
            >
              {processingImages ? (
                <div className="text-center">
                  <div className="animate-pulse mb-2">Traitement des images {processingProgress}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              ) : (
                <>
                  <p>Glissez vos images ici ou</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="upload"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                    disabled={processingImages}
                  />
                  <label 
                    htmlFor="upload" 
                    className={`text-blue-600 underline cursor-pointer ${processingImages ? 'opacity-50' : ''}`}
                  >
                    cliquez ici pour sélectionner
                  </label>
                </>
              )}
            </div>
          </section>
          
          {/* Section des images récemment téléchargées */}
          {(uploadedOriginals.length > 0 || processedImages.length > 0) && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Images récemment téléchargées</h2>
              
              {uploadedOriginals.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 mb-2">Images originales:</h3>
                  <div className="flex flex-wrap gap-2">
                    {uploadedOriginals.map((src, idx) => (
                      <div key={`orig-${idx}`} className="w-24 h-24 border rounded overflow-hidden relative">
                        <Image 
                          src={src} 
                          alt={`Original ${idx+1}`}
                          fill
                          sizes="96px" 
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {processedImages.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Images traitées (sans arrière-plan):</h3>
                  <div className="flex flex-wrap gap-2">
                    {processedImages.map((img, idx) => (
                      <div 
                        key={`processed-${idx}`} 
                        className="w-24 h-24 border rounded overflow-hidden relative"
                        style={{
                          backgroundImage: 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%)',
                          backgroundSize: '10px 10px',
                        }}
                      >
                        <Image 
                          src={img.path} 
                          alt={`Traité ${idx+1}`}
                          fill
                          sizes="96px"
                          className="object-contain"
                        />
                        {img.originalDimensions && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                            {img.originalDimensions.width}x{img.originalDimensions.height}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {processingImages && (
                <div className="mt-4 flex items-center text-blue-500">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Traitement en cours...
                </div>
              )}
            </section>
          )}
          
          {/* Galerie - Maintenant avant Thèmes */}
          {photos.length > 0 && (
            <section className="p-6 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Galerie ({photos.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={refreshPhotoGallery}
                    className="text-sm text-blue-600 flex items-center"
                    title="Rafraîchir la galerie"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualiser
                  </button>
                  <button
                    onClick={() =>
                      setSelectedPhotos(selectedPhotos.length === photos.length ? [] : photos)
                    }
                    className="text-sm underline text-blue-600"
                  >
                    {selectedPhotos.length === photos.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 mb-3">
                <strong>{selectedPhotos.length}</strong> photos sélectionnées
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-[500px] overflow-y-auto p-2">
                {photos.map((src, i) => (
                  <div
                    key={i}
                    onClick={() => togglePhoto(src)}
                    className={`cursor-pointer border rounded overflow-hidden ${
                      selectedPhotos.includes(src) ? 'ring-2 ring-green-500' : ''
                    }`}
                  >
                    <div className="relative w-full h-24">
                      <Image src={src} alt={`Photo ${i+1}`} fill sizes="100px" className="object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Thèmes - Déplacé après Galerie */}
          <section className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Choisissez un fond</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themeOptions.map((opt) => (
                <label
                  key={opt.file}
                  className={`cursor-pointer border rounded overflow-hidden transition ${
                    theme?.file === opt.file ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={theme?.file === opt.file}
                    onChange={() => setTheme(opt)}
                  />
                  <div
                    className="w-full h-20 bg-cover bg-center"
                    style={{ backgroundImage: `url(/fresque/${opt.file})` }}
                  />
                  <div className="text-center text-sm capitalize py-1">{opt.label}</div>
                </label>
              ))}
            </div>
          </section>

          {/* Chevauchement - Reste après Thèmes */}
          <section className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Réglage du chevauchement</h2>
            <label className="block mb-1 font-medium text-gray-700">
              Espacement horizontal : {overlap}px
            </label>
            <input
              type="range"
              min={-IMAGE_WIDTH + 10}
              max={100}
              step={10}
              value={overlap}
              onChange={(e) => setOverlap(parseInt(e.target.value))}
              className="w-full"
            />
          </section>
          
          {/* Bouton de validation */}
          {!leftColumnValidated && (
            <div className="p-6 bg-white rounded-lg shadow">
              <button
                onClick={handleValidation}
                disabled={selectedPhotos.length === 0}
                className={`w-full py-4 rounded-lg font-medium text-lg transition-colors ${
                  selectedPhotos.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valider mes sélections
                </div>
                {selectedPhotos.length > 0 && (
                  <p className="text-sm mt-1 font-normal">
                    {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} sélectionnée{selectedPhotos.length > 1 ? 's' : ''}
                  </p>
                )}
              </button>
            </div>
          )}
        </div>

        {/* COLONNE DROITE: Processus de génération et résultats */}
        <div className={`md:w-1/2 space-y-6 relative ${!leftColumnValidated ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Fix positioning of validation message - move to right side */}
          {!leftColumnValidated && (
            <div className="absolute right-0 top-20 transform z-10 bg-white p-4 rounded-lg shadow-lg m-4">
              <div className="flex items-center text-amber-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Validez d&apos;abord vos sélections</span>
              </div>
              <p className="text-sm text-gray-600">
                Complétez la colonne de gauche puis<br />cliquez sur Valider mes sélections
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Validation et diffusion</h2>
            <p className="text-gray-700">
              Suivez les 3 étapes du processus : assemblez d&apos;abord les images sélectionnées, 
              créez ensuite la transparence pour isoler les sujets, puis générez la vidéo 
              animée finale. Vous pourrez visualiser chaque étape et partager la vidéo 
              finale en plein écran ou l&apos;ntégrer dans votre présentation.
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
                onClick={handleGenerateBlackBgFresque}
                disabled={loading || selectedPhotos.length === 0 || !leftColumnValidated}
                className={`w-full px-4 py-3 rounded text-white ${
                  loading || selectedPhotos.length === 0 || !leftColumnValidated 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : currentStep === 1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600'
                }`}
              >
                {currentStep > 1 ? '✅ ' : ''}Étape 1: Assembler les images en fresque
              </button>
              
              <button
                onClick={handleGenerateTransparentFresque}
                disabled={loading || !fresqueBlackBgUrl}
                className={`w-full px-4 py-3 rounded text-white ${
                  loading || !fresqueBlackBgUrl ? 'bg-gray-400 cursor-not-allowed' : currentStep === 2 ? 'bg-blue-600 hover:bg-blue-700' : currentStep > 2 ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                {currentStep > 2 ? '✅ ' : ''}Étape 2: Créer la transparence
              </button>
              
              <button
                onClick={handleGenerateVideo}
                disabled={loading || !fresqueTransparentUrl}
                className={`w-full px-4 py-3 rounded text-white ${
                  loading || !fresqueTransparentUrl ? 'bg-gray-400 cursor-not-allowed' : currentStep === 3 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                }`}
              >
                {fresqueVideoUrl ? '✅ ' : ''}Étape 3: Générer la vidéo défilante
              </button>
            </div>
            
            {status && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                {status}
              </div>
            )}
          </section>

          {/* Résultats des étapes */}
          {fresqueBlackBgUrl && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Étape 1: Fresque avec fond noir</h2>
              <div className="overflow-hidden rounded border border-gray-300 bg-gray-100">
                <div className="relative w-full" style={{ height: '300px' }}>
                  <Image 
                    src={fresqueBlackBgUrl} 
                    alt="Fresque avec fond noir" 
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Cette image montre les photos assemblées avec leur fond noir original.
              </p>
            </section>
          )}

          {fresqueTransparentUrl && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Étape 2: Fresque avec transparence</h2>
              <div 
                className="overflow-hidden rounded border border-gray-300"
                style={{
                  backgroundImage: 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%)',
                  backgroundSize: '20px 20px',
                }}
              >
                <div className="relative w-full" style={{ height: '300px' }}>
                  <Image 
                    src={fresqueTransparentUrl} 
                    alt="Fresque avec transparence" 
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Cette image montre les photos avec le fond noir remplacé par de la transparence.
              </p>
            </section>
          )}

          {fresqueVideoUrl && (
            <section className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Étape 3: Vidéo avec défilement</h2>
              <div className="flex flex-col items-center">
                <video
                  src={fresqueVideoUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full rounded shadow border-4 border-blue-300 bg-black"
                  style={{ background: theme ? `url(/fresque/${theme.file}) center/cover no-repeat` : '' }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Cette vidéo montre la fresque transparente qui défile sur le fond choisi.
              </p>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    const win = window.open('', '_blank')
                    if (!win || !theme) return
                    win.document.write(`
                      <html><head><style>
                      html, body {
                        margin:0; padding:0;
                        background: url('/fresque/${theme.file}') center/cover no-repeat;
                        overflow:hidden;
                      }
                      video {
                        width: 100vw;
                        height: 100vh;
                        object-fit: contain;
                      }
                      </style></head><body>
                        <video src="${fresqueVideoUrl}" autoplay loop muted playsinline></video>
                      </body></html>
                    `)
                    win.document.close()
                  }}
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
