'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Loader from '../../../../components/ui/Loader';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';

export default function CreateProject() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // États de base - toujours déclarer tous les hooks au même niveau
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    photobooth_type: 'standard'
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [creating, setCreating] = useState(false);

  // Session check useEffect - toujours présent, pas conditionnel
  useEffect(() => {
    const getAdminSession = async () => {
      try {
        // Récupérer la session depuis localStorage ou sessionStorage
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
          console.warn("Aucune session admin trouvée, redirection vers login");
          setError("Session expirée ou non trouvée. Veuillez vous reconnecter.");
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 2000);
          return null;
        }

        // Décodage de la session avec gestion d'erreur améliorée
        let decodedSession;
        try {
          decodedSession = atob(sessionStr);
        } catch (e) {
          // Si déjà décodé ou format incorrect, utiliser directement
          decodedSession = sessionStr;
        }

        let sessionData;
        try {
          sessionData = JSON.parse(decodedSession);
        } catch (e) {
          console.error("Format de session invalide:", e);
          setError("Format de session invalide. Veuillez vous reconnecter.");
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 2000);
          return null;
        }

        // Vérifier que la session est valide
        const user_id = sessionData.user_id || sessionData.userId;
        
        if (!user_id) {
          console.warn("Session invalide (aucun user_id), redirection vers login");
          setError("Session invalide. Veuillez vous reconnecter.");
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 2000);
          return null;
        }

        // Vérifier que l'utilisateur existe toujours
        try {
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('id')  // Ne sélectionner que l'ID pour vérifier l'existence
            .eq('id', user_id)
            .single();

          if (adminError) {
            // Ne pas bloquer si l'erreur est liée à une colonne manquante
            if (adminError.message && adminError.message.includes('does not exist')) {
              console.log("Erreur de colonne, mais continuons avec l'utilisateur validé");
            } else {
              throw adminError;
            }
          }
        } catch (err) {
          // Ignorer l'erreur si c'est un problème de structure de table
          if (!err.message || !err.message.includes('does not exist')) {
            console.error("Erreur lors de la vérification de l'utilisateur:", err);
            setError("Erreur lors de la vérification de l'utilisateur. Veuillez vous reconnecter.");
            setTimeout(() => router.push('/photobooth-ia/admin/login'), 2000);
            return null;
          }
        }

        // Vérifier le plan sans bloquer la création (juste pour info)
        try {
          const { data: paymentData } = await supabase
            .from('admin_payments')
            .select('photo_quota_reset_at')
            .eq('admin_user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (paymentData) {
            const resetDate = new Date(paymentData.photo_quota_reset_at);
            const isActive = resetDate > new Date();
            
            if (!isActive) {
              console.log("Paiement expiré, mais permettre la création de projet");
            }
          }
        } catch (paymentError) {
          // Ignorer l'erreur de paiement, l'utilisateur peut quand même créer un projet
          console.warn("Erreur lors de la vérification du paiement (non bloquant)");
        }

        console.log("Session admin valide trouvée, ID:", user_id);
        setCurrentAdminId(user_id);
        setLoading(false);
        return user_id;
      } catch (err) {
        console.error("Erreur lors de la récupération de la session admin:", err);
        setError("Erreur de session. Veuillez vous reconnecter.");
        setTimeout(() => router.push('/photobooth-ia/admin/login'), 2000);
        return null;
      }
    };
    
    getAdminSession();
  }, [router, supabase]);

  // Fonction de gestion de changement des champs (pas dans un useEffect)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    
    // Générer automatiquement le slug si le champ modifié est le nom
    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      newFormData.slug = slug;
    }
    
    setFormData(newFormData);
  };

  // Fonction pour gérer le changement d'image du logo (pas dans un useEffect)
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour créer un nouveau projet (pas dans un useEffect)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentAdminId) {
      setError("Vous devez être connecté pour créer un projet");
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      let logoUrl = null;
      
      // Upload logo to AWS S3 if selected
      if (logoFile) {
        // Créer un nom de fichier unique avec timestamp et ID admin
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}-${currentAdminId.substring(0, 8)}-${logoFile.name.replace(/\s+/g, '-')}`;
        const s3Path = `photobooth_uploads/logos/${uniqueFilename}`;
        
        console.log(`Uploading logo to S3: ${s3Path}`);
        
        // Préparer le FormData pour l'upload
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('bucket', 'leeveostockage');
        formData.append('path', s3Path);
        
        // Appeler l'API d'upload S3
        const uploadResponse = await fetch('/api/upload-s3', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Erreur d'upload du logo: ${errorData.error || uploadResponse.statusText}`);
        }
        
        const uploadResult = await uploadResponse.json();
        logoUrl = uploadResult.url;
        console.log(`Logo uploaded successfully to: ${logoUrl}`);
      }
      
      // Create project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          is_active: formData.is_active,
          logo_url: logoUrl,
          created_by: currentAdminId,
          photobooth_type: formData.photobooth_type
        })
        .select()
        .single();
        
      if (projectError) throw projectError;
      
      // Redirect to project details page
      router.push(`/photobooth-ia/admin/projects/${projectData.id}`);
      
    } catch (error) {
      console.error('Error creating project:', error);
      setError(`Erreur lors de la création du projet: ${error.message}`);
      setCreating(false);
    }
  };

  // Page de chargement - doit être rendu en dehors des hooks
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader 
          size="large" 
          message="Préparation de la création de projet..." 
          variant="premium" 
        />
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Rendu principal - doit être rendu en dehors des hooks
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900">Créer un nouveau projet</h1>
        <Link
          href="/photobooth-ia/admin/projects"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
        >
          <RiArrowLeftLine className="mr-2 h-4 w-4" />
          Retour à la liste
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom du projet *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="                  mt-2 block w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white text-gray-700 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  Slug (URL) - Généré automatiquement
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    /photobooth/
                  </span>
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    readOnly
                    className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-r-lg shadow-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Le slug est généré automatiquement à partir du nom du projet.
                </p>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-2 block w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white text-gray-700 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type de Photobooth
                </label>
                <select
                  name="photobooth_type"
                  value={formData.photobooth_type}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                 
                  <option value="premium">Premium</option>
                 
                </select>
              </div>
              
              <div>
                <div className="flex items-center h-full">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Activer le projet
                  </label>
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Logo du projet</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {logoPreview ? (
                      <div className="flex flex-col items-center">
                        <div className="w-40 h-40 mb-3 relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                          }}
                          className="text-xs px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                            <span>Télécharger un fichier</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleLogoChange}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <RiSaveLine className="mr-2 h-4 w-4" />
                    Créer le projet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}