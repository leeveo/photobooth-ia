'use client';
import { useState, useEffect, useRef } from 'react';
import MailerSendTemplateSelector from './MailerSendTemplateSelector';
import dynamic from 'next/dynamic';

const SimpleRichTextEditor = dynamic(() => import('./SimpleRichTextEditor'), { ssr: false });

export default function PhotoboothEmailTemplateEditor({
  projectId,
  onTemplateChange,
  initialSubject = '',
  initialHtmlContent = '',
  onSave,
  onCancel,
  isSaving = false
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [htmlContent, setHtmlContent] = useState(initialHtmlContent);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editorMode, setEditorMode] = useState('wysiwyg'); // 'wysiwyg' | 'html'
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const textareaRef = useRef(null);
  const richEditorRef = useRef(null);

  // Variables disponibles pour insertion rapide
  const availableVariables = [
    { name: "Nom du projet", code: "{{event_name}}" },
    { name: "Date", code: "{{event_date}}" },
    { name: "Lieu", code: "{{event_location}}" },
    { name: "Prénom", code: "{{participant_firstname}}" },
    { name: "Nom", code: "{{participant_lastname}}" },
    { name: "Email", code: "{{participant_email}}" },
    { name: "Lien image", code: "{{ticket_url}}" }
  ];

  useEffect(() => {
    setSubject(initialSubject);
    setHtmlContent(initialHtmlContent);
    // eslint-disable-next-line
  }, [initialSubject, initialHtmlContent]);

  useEffect(() => {
    if (onTemplateChange) {
      onTemplateChange({ subject, html_content: htmlContent });
    }
    // eslint-disable-next-line
  }, [subject, htmlContent]);

  // Insertion de variable à la position du curseur
  const insertVariable = (variable) => {
    if (editorMode === 'html' && textareaRef.current) {
      const textarea = textareaRef.current;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const newContent =
        htmlContent.substring(0, selectionStart) +
        variable +
        htmlContent.substring(selectionEnd);
      setHtmlContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          selectionStart + variable.length,
          selectionStart + variable.length
        );
      }, 10);
    } else {
      setHtmlContent(prev => prev + ' ' + variable);
    }
  };

  // Insertion de variable dans l'éditeur
  const insertVariableToEditor = (variable) => {
    if (editorMode === 'html') {
      insertVariable(variable);
    } else {
      // Pour l'éditeur WYSIWYG, utiliser la méthode exposée
      if (richEditorRef.current && richEditorRef.current.insertText) {
        richEditorRef.current.insertText(variable);
      } else {
        // Fallback : ajouter à la fin du contenu
        setHtmlContent(prev => {
          if (!prev.trim()) {
            return `<p>${variable}</p>`;
          }
          return prev + ` ${variable}`;
        });
      }
    }
  };

  // Toggle entre WYSIWYG et HTML
  const toggleEditorMode = () => {
    setEditorMode(prev => prev === 'wysiwyg' ? 'html' : 'wysiwyg');
  };

  // Gestion du template selector
  const handleSelectMailerSendTemplate = (html) => {
    setHtmlContent(html);
    setShowTemplateSelector(false);
  };

  // Appelle la sauvegarde réelle via la prop onSave
  const handleSave = () => {
    if (!subject || !htmlContent) {
      setError("Le sujet et le contenu de l'email sont obligatoires.");
      return;
    }
    setError(null);
    if (onSave) {
      onSave({ subject, html_content: htmlContent });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-6xl max-h-[90vh] flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-4 md:p-6 text-white">
        <h2 className="text-xl font-bold">Personnaliser le modèle d&apos;email</h2>
        <p className="mt-1 text-sm text-blue-100">
          Personnalisez le modèle d&apos;email qui sera envoyé aux participants
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 my-2">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mx-4 my-2">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="flex-grow overflow-auto p-4">
        <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
          {/* Colonne de gauche: Édition */}
          <div className="lg:w-1/2 space-y-6">
            {/* Sujet de l'email */}
            <div>
              <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-1">
                Sujet de l&apos;email
              </label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Bouton pour utiliser un template MailerSend */}
            <div>
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="w-full px-4 py-2 bg-purple-100 text-purple-700 font-medium rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all text-sm flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Utiliser un modèle MailerSend
              </button>
            </div>

            {/* Variables disponibles */}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Variables disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {availableVariables.map((variable) => (
                  <button
                    key={variable.code}
                    type="button"
                    onClick={() => insertVariableToEditor(variable.code)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                    title={`Insérer ${variable.name}`}
                  >
                    {variable.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle entre WYSIWYG et HTML */}
            <div className="flex justify-end">
              <button
                onClick={toggleEditorMode}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {editorMode === 'wysiwyg' ? 'Éditer le code HTML' : 'Utiliser l\'éditeur visuel'}
              </button>
            </div>

            {/* Éditeur de contenu */}
            <div className="flex-grow">
              <label htmlFor="email-content" className="block text-sm font-medium text-gray-700 mb-1">
                Contenu de l&apos;email {editorMode === 'html' ? '(HTML)' : ''}
              </label>
              {editorMode === 'wysiwyg' ? (
                <SimpleRichTextEditor
                  ref={richEditorRef}
                  value={htmlContent}
                  onChange={setHtmlContent}
                  height="400px"
                />
              ) : (
                <textarea
                  id="email-content"
                  ref={textareaRef}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={15}
                  className="w-full h-[400px] px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                ></textarea>
              )}
            </div>
          </div>

          {/* Colonne de droite: Aperçu */}
          <div className="lg:w-1/2">
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Aperçu
            </p>
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50 h-[500px] overflow-auto">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Sujet: {subject}</h3>
              <hr className="mb-3" />
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-md hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          {isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Sélecteur de template en popup */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MailerSendTemplateSelector
            onSelectTemplate={handleSelectMailerSendTemplate}
            onClose={() => setShowTemplateSelector(false)}
          />
        </div>
      )}
    </div>
  );
}

/*
Analyse du script PhotoboothEmailTemplateEditor.js

1. Ce composant gère l'édition du template email (sujet + contenu HTML).
2. Il propose un éditeur visuel ou HTML, l'insertion de variables, et la sélection d'un modèle prédéfini.
3. Quand tu cliques sur "Sauvegarder", la fonction saveTemplate est appelée.
4. La fonction saveTemplate ne fait qu'une "simulation" de sauvegarde locale (setTimeout), elle n'enregistre rien dans la base de données.
5. Il n'y a aucun appel à Supabase ou à une API dans ce composant pour enregistrer le template dans la table photobooth_emailtemplate.
6. Les props onSave et onCancel sont attendues mais jamais utilisées dans ce composant pour déclencher la sauvegarde réelle côté parent.
7. Le vrai enregistrement dans la table doit être fait dans le parent (page.js) via la fonction handleSaveEmailTemplateFromEditor, qui reçoit les valeurs via onSave.
8. Ici, le bouton "Sauvegarder" appelle seulement saveTemplate (simulation locale), il faudrait appeler props.onSave({ subject, html_content }) pour déclencher la sauvegarde réelle dans la base.
*/