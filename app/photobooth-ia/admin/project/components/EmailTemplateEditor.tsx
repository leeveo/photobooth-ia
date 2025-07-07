'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dynamic from 'next/dynamic';
import { RiMailSendLine, RiSaveLine, RiAlertLine, RiCheckLine, RiInformationLine } from 'react-icons/ri';

// Import React-Quill dynamiquement (côté client uniquement)
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'link', 'image',
  'align'
];

export default function EmailTemplateEditor({ projectId, isActive, onSave }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: 'Votre photo du photobooth',
    sender_name: 'Photobooth App',
    sender_email: 'noreply@example.com',
    template_html: `<h2>Merci d'avoir utilisé notre photobooth!</h2>
<p>Bonjour {{name}},</p>
<p>Voici votre photo prise lors de notre événement.</p>
<div style="text-align: center;">
  <img src="{{image_url}}" alt="Votre photo" style="max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px;" />
</div>
<p>Vous pouvez télécharger cette image ou la partager sur les réseaux sociaux en utilisant le lien ci-dessous:</p>
<p style="text-align: center;">
  <a href="{{share_url}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Voir et partager votre photo</a>
</p>
<p>Merci et à bientôt!</p>`,
    template_text: `Merci d'avoir utilisé notre photobooth!

Bonjour {{name}},

Voici votre photo prise lors de notre événement.

Vous pouvez télécharger cette image ou la partager sur les réseaux sociaux en utilisant le lien ci-dessous:
{{share_url}}

Merci et à bientôt!`,
    is_active: true,
  });

  useEffect(() => {
    if (projectId) {
      loadExistingTemplate();
    }
  }, [projectId]);

  const loadExistingTemplate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photobooth_emailtemplate')
        .select('*')
        .eq('id_project', projectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors du chargement du template:', error);
        throw error;
      }

      if (data) {
        setEmailTemplate(data);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger le template d\'email existant');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmailTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleEditorChange = (content) => {
    setEmailTemplate(prev => ({ ...prev, template_html: content }));
  };

  const handleTextTemplateChange = (e) => {
    setEmailTemplate(prev => ({ ...prev, template_text: e.target.value }));
  };

  const saveTemplate = async () => {
    if (!projectId) {
      setError('ID du projet manquant. Veuillez d\'abord sauvegarder le projet.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const templateData = {
        ...emailTemplate,
        id_project: projectId,
        updated_at: new Date().toISOString()
      };
      
      // Vérifier si un template existe déjà pour ce projet
      const { data: existingData, error: checkError } = await supabase
        .from('photobooth_emailtemplate')
        .select('id')
        .eq('id_project', projectId)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      let result;
      
      if (existingData) {
        // Mise à jour du template existant
        result = await supabase
          .from('photobooth_emailtemplate')
          .update(templateData)
          .eq('id_project', projectId)
          .select();
      } else {
        // Création d'un nouveau template
        templateData.created_at = new Date().toISOString();
        result = await supabase
          .from('photobooth_emailtemplate')
          .insert(templateData)
          .select();
      }
      
      if (result.error) throw result.error;
      
      setSuccess(true);
      if (onSave) onSave(result.data[0]);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde du template d\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center space-x-2 text-lg font-medium text-indigo-700">
        <RiMailSendLine className="h-5 w-5" />
        <h3>Configuration du modèle d'email de partage</h3>
      </div>
      
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg flex items-center gap-2">
          <RiAlertLine className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 text-sm text-green-700 bg-green-50 rounded-lg flex items-center gap-2">
          <RiCheckLine className="h-5 w-5 flex-shrink-0" />
          Template d'email enregistré avec succès!
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Sujet de l'email
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={emailTemplate.subject}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Sujet de l'email"
          />
        </div>
        
        <div>
          <label htmlFor="is_active" className="block text-sm font-medium text-gray-700 mb-1">
            Activer l'envoi d'email
          </label>
          <select
            id="is_active"
            name="is_active"
            value={emailTemplate.is_active ? 'true' : 'false'}
            onChange={(e) => setEmailTemplate(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="true">Activé</option>
            <option value="false">Désactivé</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sender_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'expéditeur
          </label>
          <input
            type="text"
            id="sender_name"
            name="sender_name"
            value={emailTemplate.sender_name}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Nom affiché comme expéditeur"
          />
        </div>
        
        <div>
          <label htmlFor="sender_email" className="block text-sm font-medium text-gray-700 mb-1">
            Email de l'expéditeur
          </label>
          <input
            type="email"
            id="sender_email"
            name="sender_email"
            value={emailTemplate.sender_email}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="email@domaine.com"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <label htmlFor="template_html" className="block text-sm font-medium text-gray-700">
          Contenu HTML de l'email
        </label>
        <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 mb-2 flex items-center gap-2">
          <RiInformationLine className="h-5 w-5 text-blue-500" />
          <span>Variables disponibles: <code>{{'{{'}}name{{'}}'}}</code>, <code>{{'{{'}}image_url{{'}}'}}</code>, <code>{{'{{'}}share_url{{'}}'}}</code></span>
        </div>
        <div className="bg-white border border-gray-300 rounded-md">
          <ReactQuill
            theme="snow"
            modules={modules}
            formats={formats}
            value={emailTemplate.template_html}
            onChange={handleEditorChange}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="template_text" className="block text-sm font-medium text-gray-700 mb-1">
          Version texte de l'email (pour les clients ne supportant pas le HTML)
        </label>
        <textarea
          id="template_text"
          name="template_text"
          rows={6}
          value={emailTemplate.template_text}
          onChange={handleTextTemplateChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Version texte de l'email"
        />
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveTemplate}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sauvegarde...
            </>
          ) : (
            <>
              <RiSaveLine className="mr-2 -ml-1 h-4 w-4" />
              Sauvegarder le template
            </>
          )}
        </button>
      </div>
    </div>
  );
}
