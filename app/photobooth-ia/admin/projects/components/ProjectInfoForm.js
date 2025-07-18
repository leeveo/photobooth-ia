'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiSaveLine, RiShieldLine } from 'react-icons/ri';
import { QRCodeSVG } from 'qrcode.react';
import Loader from './Loader';

const ProjectInfoForm = ({ 
  project, 
  setProject, 
  setError, 
  setSuccess, 
  setShowSuccessPopup, 
  setSuccessMessage 
}) => {
  const supabase = createClientComponentClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  // Function to get the base URL dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use window.location in the browser
      const url = new URL(window.location.href);
      setBaseUrl(`${url.protocol}//${url.host}`);
    } else {
      // Fallback to env variable if not in browser
      setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    }
  }, []);

  // Get the current base URL for the photobooth
  const getPhotoboothUrl = () => {
    if (!project?.slug) return '';
    return `${baseUrl}/photobooth/${project.slug}`;
  };

  // Function to handle project field changes
  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setProject({
      ...project,
      [name]: value
    });
  };

  // Function to handle project name changes
  const handleNameChange = (e) => {
    // Limit to 30 characters
    const newName = e.target.value.slice(0, 30);
    setProject({
      ...project,
      name: newName
    });
  };

  // Handlers for description and home message
  const handleDescriptionChange = (e) => {
    // Limit to 200 characters
    const newDescription = e.target.value.slice(0, 200);
    setProject({
      ...project,
      description: newDescription
    });
  };

  const handleHomeMessageChange = (e) => {
    // Limit to 100 characters
    const newHomeMessage = e.target.value.slice(0, 100);
    setProject({
      ...project,
      home_message: newHomeMessage
    });
  };

  // Handler for color fields
  const handleColorChange = (colorType, value) => {
    setProject({
      ...project,
      [colorType]: value
    });
  };

  // Handler for event date change
  const handleEventDateChange = (e) => {
    setProject({
      ...project,
      event_date: e.target.value
    });
  };

  // Function to copy URL to clipboard
  const copyProjectUrl = () => {
    const fullUrl = getPhotoboothUrl();
    navigator.clipboard.writeText(fullUrl).then(() => {
      setSuccess("URL copiée dans le presse-papiers");
    }).catch((err) => {
      console.error('Failed to copy URL:', err);
      setError("Impossible de copier l'URL");
    });
  };

  // Nouvelle fonction pour confirmer l'enregistrement
  const handleSaveConfirmed = async () => {
    setSavingProject(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          home_message: project.home_message,
          primary_color: project.primary_color,
          secondary_color: project.secondary_color,
          event_date: project.event_date
        })
        .eq('id', project.id);

      if (error) throw error;

      setShowSuccessPopup(true);
      setShowSaveConfirm(false);

      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating project info:', error);
      setError("Erreur lors de la mise à jour des informations du projet");
      setShowSaveConfirm(false);
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
            <span className="text-white font-semibold">1</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              
              Informations du projet et configuration du photobooth
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configurer les détails de votre projet et personnaliser le photobooth.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white  shadow-md border border-gray-200 overflow-hidden">
        {/* Header section with essential info */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project name */}
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du projet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.358-.035-.709-.104-1.047A5.001 5.001 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="projectName"
                  name="name"
                  value={project.name}
                  onChange={handleNameChange}
                  maxLength={30}
                  className="pl-10 block w-full rounded-md border-gray-300 py-3 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 focus:shadow-md transition-all duration-200"
                  placeholder="Nom du projet"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 flex justify-between">
                <span>Maximum 30 caractères</span>
                <span className={`${project.name.length >= 25 ? 'text-orange-500' : ''} ${project.name.length >= 30 ? 'text-red-500 font-bold' : ''}`}>
                  {project.name.length}/30
                </span>
              </p>
            </div>

            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
                Date de l'événement
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="event_date"
                  value={project.event_date ? new Date(project.event_date).toISOString().slice(0, 16) : ''}
                  onChange={handleEventDateChange}
                  className="pl-10 block w-full rounded-md border-gray-300 py-2 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {project.event_date ? new Date(project.event_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Aucune date définie'}
              </p>
            </div>

            {/* Status & created date */}
            <div>
              <div className="flex justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Statut</h4>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {project.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Créé le</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(project.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content section */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne gauche : tous les inputs et preview couleurs */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    name="description"
                    value={project.description || ''}
                    onChange={handleDescriptionChange}
                    maxLength={200}
                    rows={3}
                    className="block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 transition-all duration-200"
                    placeholder="Description du projet (optionnel)"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 flex justify-between">
                  <span>Maximum 200 caractères</span>
                  <span className={`${(project.description?.length || 0) >= 180 ? 'text-orange-500' : ''} ${(project.description?.length || 0) >= 200 ? 'text-red-500 font-bold' : ''}`}>
                    {project.description?.length || 0}/200
                  </span>
                </p>
              </div>
              
              {/* Message d'accueil */}
              <div>
                <label htmlFor="homeMessage" className="block text-sm font-medium text-gray-700 mb-1">
                  Message d'accueil
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v2M7 7h10" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="homeMessage"
                    name="home_message"
                    value={project.home_message || ''}
                    onChange={handleHomeMessageChange}
                    maxLength={100}
                    className="pl-10 block w-full rounded-md border border-gray-300 py-3 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                    placeholder="Message d'accueil affiché aux utilisateurs (optionnel)"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 flex justify-between">
                  <span>Maximum 100 caractères</span>
                  <span className={`${(project.home_message?.length || 0) >= 80 ? 'text-orange-500' : ''} ${(project.home_message?.length || 0) >= 100 ? 'text-red-500 font-bold' : ''}`}>
                    {project.home_message?.length || 0}/100
                  </span>
                </p>
              </div>
              
              {/* Color selection with preview */}
              <div className="bg-gradient-to-br from-white via-indigo-50 to-purple-50 p-6 rounded-2xl border border-gray-100 shadow-md">
                <h4 className="text-base font-semibold text-gray-800 mb-6 tracking-tight flex items-center gap-2">
                  <span className="inline-block w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white shadow">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>
                  </span>
                  Couleurs du thème
                </h4>
                <div className="flex flex-col gap-6">
                  {/* Primary Color Card */}
                  <div className="flex items-center gap-4 bg-white/90 rounded-xl p-4 shadow hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <span className="text-xs font-bold text-indigo-600 mb-1">Couleur du texte</span>
                      <div className="relative">
                        <button
                          type="button"
                          className="w-12 h-12 rounded-full border-2 border-indigo-200 shadow cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                          style={{ backgroundColor: project.primary_color }}
                          onClick={() => document.getElementById('primaryColorInput').click()}
                          aria-label="Choisir couleur principale"
                        >
                          {/* Just the color preview */}
                        </button>
                        <input
                          id="primaryColorInput"
                          type="color"
                          value={project.primary_color}
                          onChange={(e) => handleColorChange('primary_color', e.target.value)}
                          className="absolute top-0 left-0 w-12 h-12 opacity-0 cursor-pointer"
                          style={{ borderRadius: '9999px' }}
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <div className="flex-1 ml-4">
                      <label htmlFor="primaryColorHex" className="block text-xs font-medium text-gray-600 mb-1">
                        Code HEX
                      </label>
                      <input
                        id="primaryColorHex"
                        type="text"
                        value={project.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                        className="w-28 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-center text-sm font-mono bg-white"
                        placeholder="#RRGGBB"
                        maxLength={7}
                      />
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-200 shadow-inner"
                        style={{ backgroundColor: project.primary_color }}
                        title="Aperçu"
                      />
                    </div>
                  </div>
                  {/* Secondary Color Card */}
                  <div className="flex items-center gap-4 bg-white/90 rounded-xl p-4 shadow hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <span className="text-xs font-bold text-purple-600 mb-1">Couleur du fond</span>
                      <div className="relative">
                        <button
                          type="button"
                          className="w-12 h-12 rounded-full border-2 border-purple-200 shadow cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                          style={{ backgroundColor: project.secondary_color }}
                          onClick={() => document.getElementById('secondaryColorInput').click()}
                          aria-label="Choisir couleur secondaire"
                        >
                          {/* Just the color preview */}
                        </button>
                        <input
                          id="secondaryColorInput"
                          type="color"
                          value={project.secondary_color}
                          onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                          className="absolute top-0 left-0 w-12 h-12 opacity-0 cursor-pointer"
                          style={{ borderRadius: '9999px' }}
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <div className="flex-1 ml-4">
                      <label htmlFor="secondaryColorHex" className="block text-xs font-medium text-gray-600 mb-1">
                        Code HEX
                      </label>
                      <input
                        id="secondaryColorHex"
                        type="text"
                        value={project.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                        className="w-28 rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-center text-sm font-mono bg-white"
                        placeholder="#RRGGBB"
                        maxLength={7}
                      />
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-200 shadow-inner"
                        style={{ backgroundColor: project.secondary_color }}
                        title="Aperçu"
                      />
                    </div>
                  </div>
                </div>
                {/* Modern Color Preview */}
                <div className="mt-8 flex items-center justify-center">
                  <div 
                    className="w-full max-w-xs py-4 px-6 rounded-xl shadow border border-gray-200 text-center font-medium"
                    style={{ 
                      backgroundColor: project.secondary_color,
                      color: project.primary_color,
                      transition: 'all 0.3s'
                    }}
                  >
                    Aperçu des couleurs du thème
                  </div>
                </div>
              </div>
            </div>
            {/* Colonne droite : QR code */}
            <div>
              {/* Nouveau design QR code */}
              <div className="relative bg-gradient-to-br from-indigo-100 via-purple-100 to-white p-5 rounded-2xl border-2 border-indigo-300 shadow-xl h-full flex flex-col items-center animate-pulse border-dashed">
                {/* Bordure animée */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none border-4 border-transparent border-double"
                  style={{
                    background: 'linear-gradient(120deg, #7f5af0 0%, #ff80b5 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    zIndex: 1,
                  }}
                />
                {/* Icône stylisée */}
                <div className="flex items-center justify-center mb-2 z-10">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                      <rect width="24" height="24" rx="6" fill="#fff" />
                      <path d="M7 7h2v2H7V7zm8 0h2v2h-2V7zM7 15h2v2H7v-2zm8 0h2v2h-2v-2z" fill="#7f5af0"/>
                      <rect x="10" y="10" width="4" height="4" rx="1" fill="#7f5af0"/>
                    </svg>
                  </span>
                </div>
                {/* Titre stylisé */}
                <h4 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2 z-10 tracking-tight uppercase drop-shadow-lg">
                  Accès Photobooth
                </h4>
                {/* URL stylisée */}
                <div className="relative w-full mb-3 z-10">
                  <input
                    type="text"
                    value={getPhotoboothUrl()}
                    readOnly
                    className="pl-8 pr-2 block w-full rounded-md border-2 border-indigo-200 bg-white py-2 text-sm text-indigo-700 font-semibold shadow focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition"
                  />
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={copyProjectUrl}
                  className="mb-4 inline-flex justify-center items-center px-4 py-2 border border-indigo-300 shadow text-xs font-bold rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                  </svg>
                  Copier l'URL
                </button>
                {/* Bouton pour ouvrir le photobooth dans un nouvel onglet */}
                {getPhotoboothUrl() && (
                  <button
                    onClick={() => window.open(getPhotoboothUrl(), '_blank', 'noopener,noreferrer')}
                    className="mb-4 inline-flex justify-center items-center px-4 py-2 border border-indigo-300 shadow text-xs font-bold rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0 0L10 21l-7-7 11-11z"/>
                    </svg>
                    Ouvrir le photobooth
                  </button>
                )}
                {/* QR code avec effet */}
                <div className="flex-1 flex flex-col items-center justify-center bg-white/80 p-4 rounded-xl border-2 border-indigo-100 shadow-inner z-10">
                  <div className="text-center mb-2">
                    <span className="text-xs font-bold text-indigo-500 tracking-widest uppercase">QR Code</span>
                  </div>
                  {project && baseUrl && (
                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-200 via-purple-200 to-white shadow-lg border border-indigo-200">
                      <QRCodeSVG
                        value={getPhotoboothUrl()}
                        size={240} // taille augmentée
                        level="M"
                        bgColor="#FFFFFF"
                        fgColor="#7f5af0"
                        className="mb-2"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-indigo-700 text-center font-semibold">
                    <span className="inline-block animate-bounce">👇</span> Scannez ce code pour accéder directement au photobooth
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with save button */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={() => setShowSaveConfirm(true)}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <>
                <Loader size="small" message="" variant="premium" />
                <span className="ml-2">Enregistrement...</span>
              </>
            ) : (
              <>
                <RiSaveLine className="mr-2 h-4 w-4" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>

        {/* Popup de confirmation d'enregistrement */}
        {showSaveConfirm && (
          <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-success-popup"
              onClick={e => e.stopPropagation()}>
              {/* Header avec effet de gradient */}
              <div className="h-28 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                <div className="z-10 rounded-full bg-white bg-opacity-20 p-4 animate-success-icon">
                  <RiSaveLine className="h-12 w-12 text-white" />
                </div>
              </div>
              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-3 animate-success-text">Confirmer l'enregistrement</h3>
                <p className="text-gray-300 mb-4 animate-success-text" style={{ animationDelay: "0.1s" }}>
                  Voulez-vous enregistrer les modifications apportées à ce projet ?
                </p>
                <div className="mt-6 text-sm text-gray-400 animate-success-text" style={{ animationDelay: "0.2s" }}>
                  Ces informations seront appliquées immédiatement.
                </div>
              </div>
              {/* Footer */}
              <div className="bg-gray-900 px-6 py-4 flex justify-center space-x-4 animate-success-text" style={{ animationDelay: "0.3s" }}>
                <button
                  type="button"
                  onClick={() => setShowSaveConfirm(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                  disabled={savingProject}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfirmed}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg flex items-center"
                  disabled={savingProject}
                >
                  {savingProject ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <RiSaveLine className="mr-2 h-4 w-4" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInfoForm;


