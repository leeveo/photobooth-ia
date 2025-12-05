'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  RiPrinterLine, 
  RiPlayFill, 
  RiPauseFill, 
  RiCloseFill,
  RiCheckLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiVolumeUpFill,
  RiVolumeMuteFill,
  RiImageLine,
  RiArrowLeftLine,
  RiSettings3Line
} from 'react-icons/ri';

export default function PrintMonitor() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoprint, setAutoprint] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newImages, setNewImages] = useState([]);
  const [printQueue, setPrintQueue] = useState([]);
  const [printHistory, setPrintHistory] = useState([]);
  const [lastImageId, setLastImageId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(5000); // 5 secondes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pollingRef = useRef(null);
  const audioRef = useRef(null);

  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/photobooth-ia/admin');
          return;
        }

        const { data: adminData, error: adminError } = await supabase
          .from('admin')
          .select('id')
          .eq('email', session.user.email)
          .single();

        if (adminError || !adminData) {
          router.push('/photobooth-ia/admin');
          return;
        }

        setCurrentAdminId(adminData.id);
      } catch (err) {
        console.error('Error getting admin session:', err);
        router.push('/photobooth-ia/admin');
      }
    };

    getAdminSession();
  }, [router, supabase]);

  // Charger les projets
  useEffect(() => {
    async function loadProjects() {
      if (!currentAdminId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, logo_url')
          .eq('admin_id', currentAdminId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        setError('Erreur lors du chargement des projets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [supabase, currentAdminId]);

  // Fonction de notification sonore
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKns8bJiHgU7k9r0yoIzBipzxvLaizsIGGS57OihUQ0PUKXh8bllHwU5ktbz0YU0Bh9uwO/jmVENEFWr7PGxYh4FOpPZ9MqDMwYpcsPy2os7CBhkuezooVENEFCl4fG5ZR8FOpLW89GENgYfbsDv45lRDRBVq+zxsWIeBTqT2fTKgzMGKXLD8tqLOwgYZLns6KFRDRBQpeHxuWUfBTqS1vPRhDYGH27A7eSaUQwPVKvs8bFiHgU6k9n0yoM0Bilyw/Laiyw=');
    }
    
    audioRef.current.play().catch(e => console.log('Could not play sound:', e));
  }, [soundEnabled]);

  // Fonction pour récupérer les nouvelles images
  const checkForNewImages = useCallback(async () => {
    if (!selectedProject) return;

    try {
      const projectIdToQuery = String(selectedProject).trim();
      
      // Requête pour les nouvelles images
      let query = supabase
        .from('sessions')
        .select('id, result_s3_url, result_image_url, created_at, isModerated')
        .eq('project_id', projectIdToQuery)
        .eq('isModerated', false)
        .not('result_s3_url', 'is', null)
        .not('result_image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Si on a déjà un dernier ID, ne récupérer que les plus récents
      if (lastImageId) {
        query = query.gt('id', lastImageId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Nouvelles images détectées
        const newImagesData = data.map(session => ({
          id: session.id,
          image_url: session.result_image_url || session.result_s3_url,
          created_at: session.created_at,
          status: 'pending'
        }));

        // Notification sonore
        playNotificationSound();

        // Ajouter à la liste des nouvelles images
        setNewImages(prev => [...newImagesData, ...prev].slice(0, 50)); // Garder max 50 images

        // Si autoprint activé, ajouter à la queue d'impression
        if (autoprint) {
          setPrintQueue(prev => [...prev, ...newImagesData]);
        }

        // Mettre à jour le dernier ID
        setLastImageId(data[0].id);
      }
    } catch (err) {
      console.error('Error checking for new images:', err);
    }
  }, [selectedProject, lastImageId, autoprint, playNotificationSound, supabase]);

  // Démarrer/arrêter le monitoring
  useEffect(() => {
    if (isMonitoring && selectedProject) {
      // Première vérification immédiate
      checkForNewImages();
      
      // Puis polling régulier
      pollingRef.current = setInterval(checkForNewImages, pollingInterval);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isMonitoring, selectedProject, pollingInterval, checkForNewImages]);

  // Fonction d'optimisation d'image (reprise de clientPrint.js)
  const optimizeImageForPrint = useCallback((imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Redimensionner si nécessaire (max 1800px)
        const maxDimension = 1800;
        let width = img.width;
        let height = img.height;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Fond blanc
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Dessiner l'image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en base64 JPEG
        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(optimizedBase64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }, []);

  // Fonction d'impression
  const printImage = useCallback(async (imageData) => {
    try {
      // Optimiser l'image
      const optimizedImage = await optimizeImageForPrint(imageData.image_url);
      
      // Créer le HTML d'impression
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Impression Photo</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              width: auto;
              height: auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${optimizedImage}" alt="Photo" onload="window.print();" />
        </body>
        </html>
      `;
      
      // Ouvrir dans une nouvelle fenêtre et imprimer
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printHtml);
      printWindow.document.close();
      
      // Ajouter à l'historique
      setPrintHistory(prev => [{
        id: imageData.id,
        image_url: imageData.image_url,
        printed_at: new Date().toISOString(),
        status: 'success'
      }, ...prev].slice(0, 100)); // Garder max 100 entrées
      
      return true;
    } catch (error) {
      console.error('Print error:', error);
      
      // Ajouter à l'historique avec erreur
      setPrintHistory(prev => [{
        id: imageData.id,
        image_url: imageData.image_url,
        printed_at: new Date().toISOString(),
        status: 'error',
        error: error.message
      }, ...prev].slice(0, 100));
      
      return false;
    }
  }, [optimizeImageForPrint]);

  // Process print queue
  useEffect(() => {
    if (printQueue.length > 0 && autoprint) {
      const nextImage = printQueue[0];
      
      // Imprimer l'image
      printImage(nextImage).then(() => {
        // Retirer de la queue
        setPrintQueue(prev => prev.slice(1));
      });
    }
  }, [printQueue, autoprint, printImage]);

  // Impression manuelle
  const handleManualPrint = useCallback((imageData) => {
    printImage(imageData);
  }, [printImage]);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    if (!selectedProject) {
      setError('Veuillez sélectionner un projet');
      return;
    }
    setIsMonitoring(prev => !prev);
    setError(null);
  }, [selectedProject]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <RiPrinterLine className="w-8 h-8" />
                Monitoring d&apos;Impression Automatique
              </h1>
              <p className="text-white text-opacity-80 text-sm">
                Surveillez les nouvelles photos et imprimez-les automatiquement depuis votre PC
              </p>
            </div>
            <Link
              href="/photobooth-ia/admin/project-gallery"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RiArrowLeftLine className="w-5 h-5" />
              Retour
            </Link>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <RiErrorWarningLine className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <RiSettings3Line className="w-6 h-6 text-indigo-600" />
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projet à surveiller
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setLastImageId(null);
                  setNewImages([]);
                  setPrintQueue([]);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isMonitoring}
              >
                <option value="">Sélectionnez un projet</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Polling interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalle de vérification
              </label>
              <select
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isMonitoring}
              >
                <option value={3000}>3 secondes</option>
                <option value={5000}>5 secondes</option>
                <option value={10000}>10 secondes</option>
                <option value={30000}>30 secondes</option>
              </select>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <button
              onClick={toggleMonitoring}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                isMonitoring
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              disabled={!selectedProject}
            >
              {isMonitoring ? (
                <>
                  <RiPauseFill className="w-5 h-5" />
                  Arrêter le monitoring
                </>
              ) : (
                <>
                  <RiPlayFill className="w-5 h-5" />
                  Démarrer le monitoring
                </>
              )}
            </button>

            <button
              onClick={() => setAutoprint(prev => !prev)}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                autoprint
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              disabled={!isMonitoring}
            >
              <RiPrinterLine className="w-5 h-5" />
              Impression auto: {autoprint ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all"
            >
              {soundEnabled ? (
                <>
                  <RiVolumeUpFill className="w-5 h-5" />
                  Son activé
                </>
              ) : (
                <>
                  <RiVolumeMuteFill className="w-5 h-5" />
                  Son désactivé
                </>
              )}
            </button>
          </div>

          {/* Status indicators */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{newImages.length}</div>
              <div className="text-sm text-gray-600">Nouvelles photos</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{printQueue.length}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {printHistory.filter(h => h.status === 'success').length}
              </div>
              <div className="text-sm text-gray-600">Imprimées</div>
            </div>
          </div>
        </div>

        {/* New Images Grid */}
        {newImages.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <RiImageLine className="w-6 h-6 text-indigo-600" />
              Nouvelles photos détectées ({newImages.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {newImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square relative overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-100">
                    <Image
                      src={image.image_url}
                      alt="Photo"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
                    <button
                      onClick={() => handleManualPrint(image)}
                      className="p-3 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Imprimer maintenant"
                    >
                      <RiPrinterLine className="w-5 h-5 text-indigo-600" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    {new Date(image.created_at).toLocaleTimeString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Print History */}
        {printHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <RiTimeLine className="w-6 h-6 text-indigo-600" />
              Historique d&apos;impression
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {printHistory.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    item.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'success' ? (
                      <RiCheckLine className="w-5 h-5 text-green-600" />
                    ) : (
                      <RiErrorWarningLine className="w-5 h-5 text-red-600" />
                    )}
                    <div className="w-12 h-12 relative rounded overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt="Printed"
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Photo #{item.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.printed_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  {item.error && (
                    <div className="text-xs text-red-600">{item.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isMonitoring && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📖 Instructions d&apos;utilisation
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Sélectionnez le projet à surveiller dans la liste déroulante</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Cliquez sur &quot;Démarrer le monitoring&quot; pour commencer la surveillance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Activez &quot;Impression auto&quot; pour imprimer automatiquement chaque nouvelle photo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Les nouvelles photos apparaîtront en temps réel avec une notification sonore</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">5.</span>
                <span>Vous pouvez aussi imprimer manuellement en survolant une photo et en cliquant sur l&apos;icône</span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Astuce :</strong> Connectez votre imprimante à ce PC avant de démarrer.
                L&apos;impression se fera via le dialogue d&apos;impression standard de Windows.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
