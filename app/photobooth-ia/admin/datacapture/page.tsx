'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { 
  RiFilterLine, 
  RiDownloadLine, 
  RiArrowLeftLine, 
  RiUserLine, 
  RiMailLine,
  RiPhoneLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiFileExcelLine,
  RiEyeLine,
  RiCalendarLine
} from 'react-icons/ri';

export default function DataCapture() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [capturedData, setCapturedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataCount, setDataCount] = useState({});
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = () => {
      try {
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
          console.warn("Aucune session admin trouvée, redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        let decodedSession = sessionStr;
        try {
          decodedSession = atob(sessionStr);
        } catch (e) {
          // Si déjà décodé, ignorer
        }
        const sessionData = JSON.parse(decodedSession);

        if (!sessionData.user_id && sessionData.userId) {
          sessionData.user_id = sessionData.userId;
        }

        if (!sessionData.user_id) {
          console.warn("Session invalide (aucun user_id), redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        console.log("Session admin trouvée, ID:", sessionData.user_id);
        setCurrentAdminId(sessionData.user_id);
        return sessionData.user_id;
      } catch (err) {
        console.error("Erreur lors de la récupération de la session admin:", err);
        router.push('/photobooth-ia/admin/login');
        return null;
      }
    };
    
    getAdminSession();
  }, [router]);
  
  // Charger la liste des projets créés par l'admin connecté
  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, slug, datacapture')
          .eq('created_by', currentAdminId)
          .eq('datacapture', true); // Seulement les projets avec datacapture activée

        if (projectsError) {
          console.error("Erreur récupération projets:", projectsError);
          setError('Erreur récupération des projets');
          setLoading(false);
          return;
        }

        console.log("Projets avec datacapture activée:", projectsData);
        setProjects(projectsData || []);

        // Compter les données capturées pour chaque projet
        const counts = {};
        for (const project of projectsData || []) {
          const { data: dataRows, count, error: countError } = await supabase
            .from('photobooth_datacapture')
            .select('id', { count: 'exact', head: false })
            .eq('id_projects', project.id);

          if (countError) {
            console.error(`Erreur lors du comptage pour le projet ${project.id}:`, countError);
          }
          counts[project.id] = countError ? 0 : (count || 0);
        }
        setDataCount(counts);
        console.log("Comptes de données par projet:", counts);
      } catch (err) {
        setError('Impossible de charger les projets');
        console.error("Erreur globale loadProjects:", err);
      } finally {
        setLoading(false);
      }
    }

    if (currentAdminId) loadProjects();
  }, [supabase, currentAdminId]);
  
  // Charger les données capturées du projet sélectionné
  useEffect(() => {
    if (!selectedProject) {
      setCapturedData([]);
      return;
    }

    async function loadCapturedData() {
      setLoading(true);
      try {
        const { data: captureData, error: captureError } = await supabase
          .from('photobooth_datacapture')
          .select('*')
          .eq('id_projects', selectedProject)
          .order('created_at', { ascending: false });

        if (captureError) {
          console.error("Erreur récupération données capturées:", captureError);
          setCapturedData([]);
        } else {
          console.log("Données capturées récupérées:", captureData);
          setCapturedData(captureData || []);
        }
      } catch (err) {
        setError('Impossible de charger les données capturées du projet');
        console.error("Erreur globale loadCapturedData:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCapturedData();
  }, [selectedProject, supabase]);
  
  // Fonction de tri
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Données triées
  const sortedData = [...capturedData].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    }
    return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
  });

  // Fonction d'export CSV
  const exportToCSV = () => {
    if (capturedData.length === 0) {
      setError('Aucune donnée à exporter');
      return;
    }

    const headers = ['Nom', 'Email', 'Téléphone', 'RGPD Accepté', 'Date de capture'];
    const csvContent = [
      headers.join(','),
      ...capturedData.map(row => [
        `"${row.name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.phone || ''}"`,
        row.rgpd_text ? 'Oui' : 'Non',
        `"${new Date(row.created_at).toLocaleString('fr-FR')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const projectName = projects.find(p => p.id === selectedProject)?.name || 'projet';
    link.setAttribute('download', `donnees-${projectName}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess('Fichier CSV téléchargé avec succès');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Données Capturées des Utilisateurs
      </h2>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <label htmlFor="projectSelect" className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionnez un projet avec capture de données
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full">
              <select
                id="projectSelect"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-gray-50"
                onChange={(e) => setSelectedProject(e.target.value)}
                value={selectedProject || ''}
              >
                <option value="">-- Choisissez un projet --</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.id})
                  </option>
                ))}
              </select>
              
              {/* Indicateur de nombre de données par projet */}
              {selectedProject && (
                <div className="mt-2 text-sm text-indigo-600 flex items-center">
                  <RiFilterLine className="mr-1 h-4 w-4 text-indigo-400" />
                  <span className="font-semibold">{dataCount[selectedProject] || 0}</span> 
                  <span className="ml-1">données capturées pour ce projet</span>
                </div>
              )}
              
              {/* Affichage du nombre de données pour tous les projets */}
              {!selectedProject && projects.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-gray-500">Nombre de données par projet:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {projects.map(project => (
                      <div 
                        key={`count-${project.id}`} 
                        className="bg-gray-50 px-3 py-1.5 rounded-md text-xs flex justify-between items-center hover:bg-indigo-50 cursor-pointer"
                        onClick={() => setSelectedProject(project.id)}
                      >
                        <span className="truncate" title={project.name}>{project.name}</span>
                        <span className="ml-2 font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {dataCount[project.id] !== undefined ? dataCount[project.id] : '...'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm ${
                  selectedProject && capturedData.length > 0
                    ? 'text-white bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 border-transparent' 
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed border-gray-300'
                }`}
                disabled={!selectedProject || capturedData.length === 0}
                title="Exporter les données en CSV"
              >
                <RiFileExcelLine className="h-5 w-5 mr-2" />
                Exporter CSV
              </button>
            </div>
          </div>
        </div>
        
        {loading && selectedProject ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner text="Chargement des données en cours" size="medium" color="indigo" />
          </div>
        ) : null}
        
        {!loading && selectedProject && capturedData.length === 0 ? (
          <div className="text-center py-16 px-6">
            <RiUserLine className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">Aucune donnée trouvée</p>
            <p className="mt-2 text-gray-500">Ce projet n'a pas encore de données utilisateur capturées</p>
          </div>
        ) : null}
        
        {!loading && selectedProject && capturedData.length > 0 && (
          <div className="p-6">
            <div className="mb-4 text-sm flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-600 flex items-center">
                <RiFilterLine className="mr-2 h-5 w-5 text-gray-400" />
                <span className="font-semibold text-gray-700">{capturedData.length}</span> donnée(s) capturée(s)
              </div>
              <div className="text-sm text-indigo-600 font-medium">
                {projects.find(p => p.id == selectedProject)?.name || 'Projet'} : {dataCount[selectedProject] || capturedData.length} utilisateurs
              </div>
            </div>

            {/* Tableau des données */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        <RiUserLine className="mr-2 h-4 w-4" />
                        Nom
                        {sortConfig.key === 'name' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        <RiMailLine className="mr-2 h-4 w-4" />
                        Email
                        {sortConfig.key === 'email' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors"
                      onClick={() => handleSort('phone')}
                    >
                      <div className="flex items-center">
                        <RiPhoneLine className="mr-2 h-4 w-4" />
                        Téléphone
                        {sortConfig.key === 'phone' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors"
                      onClick={() => handleSort('rgpd_text')}
                    >
                      <div className="flex items-center">
                        <RiShieldLine className="mr-2 h-4 w-4" />
                        RGPD
                        {sortConfig.key === 'rgpd_text' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        <RiCalendarLine className="mr-2 h-4 w-4" />
                        Date de capture
                        {sortConfig.key === 'created_at' && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((row, index) => (
                    <tr key={row.id_data} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {row.name ? row.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{row.name || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.email || 'Non renseigné'}</div>
                        {row.email && (
                          <div className="text-xs text-gray-500">Email fourni</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.phone || 'Non renseigné'}</div>
                        {row.phone && (
                          <div className="text-xs text-gray-500">Téléphone fourni</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.rgpd_text 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {row.rgpd_text ? (
                            <>
                              <RiShieldCheckLine className="mr-1 h-3 w-3" />
                              Accepté
                            </>
                          ) : (
                            <>
                              <RiShieldLine className="mr-1 h-3 w-3" />
                              Refusé
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{new Date(row.created_at).toLocaleDateString('fr-FR')}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(row.created_at).toLocaleTimeString('fr-FR')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Statistiques */}
            {capturedData.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <RiUserLine className="h-8 w-8 mr-3" />
                    <div>
                      <div className="text-2xl font-bold">{capturedData.length}</div>
                      <div className="text-sm opacity-80">Total utilisateurs</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <RiMailLine className="h-8 w-8 mr-3" />
                    <div>
                      <div className="text-2xl font-bold">
                        {capturedData.filter(d => d.email).length}
                      </div>
                      <div className="text-sm opacity-80">Emails fournis</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <RiPhoneLine className="h-8 w-8 mr-3" />
                    <div>
                      <div className="text-2xl font-bold">
                        {capturedData.filter(d => d.phone).length}
                      </div>
                      <div className="text-sm opacity-80">Téléphones fournis</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <RiShieldCheckLine className="h-8 w-8 mr-3" />
                    <div>
                      <div className="text-2xl font-bold">
                        {capturedData.filter(d => d.rgpd_text).length}
                      </div>
                      <div className="text-sm opacity-80">RGPD acceptés</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-6">
        <Link
          href="/photobooth-ia/admin/projects"
          className="px-4 py-2 border border-transparent text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm hover:from-blue-600 hover:to-purple-700 flex items-center gap-2"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Retour aux projets
        </Link>
      </div>
    </div>
  );
}
