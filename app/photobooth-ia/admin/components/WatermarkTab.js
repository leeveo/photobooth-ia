'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WatermarkPreview from './WatermarkPreview';

export default function WatermarkTab({ 
  formData, 
  setFormData, 
  handleChange,
  watermarkLogoPreview, 
  handleWatermarkLogoChange,
  isEditing,
  tempProjectId,
  projects,
  supabase,
  setSuccess,
  setError 
}) {
  // Pass all needed data and functions as props
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg shadow-md text-white">
        <h3 className="text-xl font-bold">Configuration du filigrane</h3>
        <p className="text-white opacity-90">
          Personnalisez le filigrane qui apparaîtra sur les photos générées.
        </p>
      </div>

      {/* Toggle switch */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Activation du filigrane</h3>
            <p className="text-sm text-gray-600 mt-1">Activez cette option pour ajouter un filigrane</p>
          </div>
          <div className="ml-4 flex items-center">
            <input
              id="watermark_enabled"
              name="watermark_enabled"
              type="checkbox"
              checked={formData.watermark_enabled}
              onChange={(e) => {
                setFormData({...formData, watermark_enabled: e.target.checked});
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {formData.watermark_enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      {!(isEditing || tempProjectId) ? (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p className="text-gray-600 mb-4">
            Veuillez d&apos;abord créer le projet ou sélectionner un projet existant.
          </p>
          <button 
            type="button"
            disabled={true}
            className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg font-medium shadow cursor-not-allowed"
          >
            Configuration non disponible
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Preview */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Aperçu</h3>
            <div className="border rounded-lg overflow-hidden bg-gray-100 p-2">
              <div className="relative w-full" style={{ paddingBottom: '150%' }}>
                <div className="absolute inset-0">
                  <WatermarkPreview 
                    project={projects.find(p => p.id === (isEditing || tempProjectId))} 
                    sampleImage="/samples/sample-portrait-1.jpg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Options</h3>
            
            <div className="space-y-4">
              {/* Text */}
              <div>
                <label htmlFor="watermark_text" className="block text-sm font-medium text-gray-700 mb-1">
                  Texte
                </label>
                <input
                  type="text"
                  id="watermark_text"
                  name="watermark_text"
                  value={formData.watermark_text}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="ex: © 2023 Mon Entreprise"
                />
              </div>

              {/* Position */}
              <div>
                <label htmlFor="watermark_position" className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  id="watermark_position"
                  name="watermark_position"
                  value={formData.watermark_position}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="top-left">En haut à gauche</option>
                  <option value="top-center">En haut au centre</option>
                  <option value="top-right">En haut à droite</option>
                  <option value="bottom-left">En bas à gauche</option>
                  <option value="bottom-center">En bas au centre</option>
                  <option value="bottom-right">En bas à droite</option>
                  <option value="center">Au centre</option>
                </select>
              </div>

              {/* Color */}
              <div>
                <label htmlFor="watermark_text_color" className="block text-sm font-medium text-gray-700 mb-1">
                  Couleur du texte
                </label>
                <div className="flex items-center">
                  <input
                    type="color"
                    id="watermark_text_color"
                    name="watermark_text_color"
                    value={formData.watermark_text_color}
                    onChange={handleChange}
                    className="h-8 w-8 p-0 border-0"
                  />
                  <input
                    type="text"
                    name="watermark_text_color"
                    value={formData.watermark_text_color}
                    onChange={handleChange}
                    className="ml-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo
                </label>
                <div className="flex items-center space-x-4">
                  {watermarkLogoPreview && (
                    <div className="w-16 h-16 relative border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                      <Image
                        src={watermarkLogoPreview}
                        alt="Logo preview"
                        fill
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="watermark_logo"
                      name="watermark_logo"
                      accept="image/*"
                      onChange={handleWatermarkLogoChange}
                      className="text-sm text-gray-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Advanced editor link */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <h4 className="text-md font-medium text-indigo-700 mb-2">Éditeur avancé</h4>
                <Link 
                  href={`/photobooth-ia/admin/watermark-editor?projectId=${isEditing || tempProjectId}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Ouvrir l&apos;éditeur avancé
                </Link>
              </div>
            </div>
            
            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('projects')
                      .update({
                        watermark_enabled: formData.watermark_enabled,
                        watermark_text: formData.watermark_text,
                        watermark_position: formData.watermark_position,
                        watermark_text_color: formData.watermark_text_color
                      })
                      .eq('id', isEditing || tempProjectId);
                      
                    if (error) throw error;
                    setSuccess('Paramètres mis à jour avec succès !');
                  } catch (error) {
                    setError(error.message);
                  }
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
