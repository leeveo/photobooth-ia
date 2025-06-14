'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiSaveLine } from 'react-icons/ri';
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
    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth/${project.slug}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setSuccess("URL copiée dans le presse-papiers");
    }).catch((err) => {
      console.error('Failed to copy URL:', err);
      setError("Impossible de copier l'URL");
    });
  };

  // A unified save function for all project fields
  const saveProjectInfo = async () => {
    try {
      setIsSubmitting(true);
      
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
      
      // Instead of setting success message, show the popup
      setSuccessMessage("Informations du projet mises à jour avec succès");
      setShowSuccessPopup(true);
      
      // Auto-hide the popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error updating project info:', error);
      setError("Erreur lors de la mise à jour des informations du projet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
          <span className="text-white font-semibold">1</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Informations du projet et personnamisation du photobooth</h3>
      </div>
      
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column: Description & Home message */}
            <div className="md:col-span-2 space-y-6">
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
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Couleurs du thème</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-600 mb-1">
                      Couleur principale
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-md shadow-sm cursor-pointer border border-gray-300 transition-transform hover:scale-105"
                          style={{ backgroundColor: project.primary_color }}
                        >
                          <input 
                            type="color" 
                            id="primaryColor"
                            value={project.primary_color} 
                            onChange={(e) => handleColorChange('primary_color', e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            aria-label="Choisir couleur principale"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={project.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="#RRGGBB"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-600 mb-1">
                      Couleur secondaire
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-md shadow-sm cursor-pointer border border-gray-300 transition-transform hover:scale-105"
                          style={{ backgroundColor: project.secondary_color }}
                        >
                          <input 
                            type="color" 
                            id="secondaryColor"
                            value={project.secondary_color} 
                            onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            aria-label="Choisir couleur secondaire"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={project.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="#RRGGBB"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Color preview section */}
                <div className="mt-3 flex items-center justify-center">
                  <div className="w-full h-12 rounded-lg overflow-hidden flex shadow-sm border border-gray-200">
                    <div className="w-1/2 flex items-center justify-center" style={{ backgroundColor: project.primary_color }}>
                      <span className="font-medium text-white text-shadow text-sm">Primaire</span>
                    </div>
                    <div className="w-1/2 flex items-center justify-center" style={{ backgroundColor: project.secondary_color }}>
                      <span className="font-medium text-white text-shadow text-sm">Secondaire</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column: URL and QR code */}
            <div className="md:col-span-1">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full flex flex-col">
                <h4 className="text-sm font-medium text-gray-700 mb-3">URL du photobooth</h4>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={`${process.env.NEXT_PUBLIC_BASE_URL}/photobooth/${project?.slug}`}
                    readOnly
                    className="pl-8 block w-full rounded-md border-gray-300 bg-white py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <button
                  onClick={copyProjectUrl}
                  className="mt-2 inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                  </svg>
                  Copier l'URL
                </button>
                
                <div className="flex-1 mt-4 flex flex-col items-center justify-center bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-center mb-2">
                    <span className="text-xs font-medium text-gray-500">QR Code</span>
                  </div>
                  {project && (
                    <QRCodeSVG
                      value={`${process.env.NEXT_PUBLIC_BASE_URL}/photobooth/${project.slug}`}
                      size={140}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      className="mb-2"
                    />
                  )}
                  <p className="mt-1 text-xs text-gray-500 text-center">
                    Scannez ce code pour accéder directement au photobooth
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
            onClick={saveProjectInfo}
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
      </div>
    </div>
  );
};

export default ProjectInfoForm;
