'use client'

import React, { useEffect, useRef } from 'react'

export default function SimpleRichTextEditor({ 
  value, 
  onChange, 
  className = '', 
  height = '400px' 
}) {
  const editorRef = useRef(null)
  
  // Initialize the editor with the content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
    }
  }, [value])
  
  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }
  
  // Format commands
  const execCommand = (command, value = '') => {
    document.execCommand(command, false, value)
    handleInput()
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }
  
  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 bg-gray-50">
        <button 
          type="button" 
          onClick={() => execCommand('bold')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Gras"
        >
          <span className="font-bold">G</span>
        </button>
        <button 
          type="button" 
          onClick={() => execCommand('italic')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Italique"
        >
          <span className="italic">I</span>
        </button>
        <button 
          type="button" 
          onClick={() => execCommand('underline')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Souligné"
        >
          <span className="underline">S</span>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Titre 1"
        >
          H1
        </button>
        <button 
          type="button" 
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Titre 2"
        >
          H2
        </button>
        <button 
          type="button" 
          onClick={() => execCommand('formatBlock', '<p>')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Paragraphe"
        >
          ¶
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Liste à puces"
        >
          • Liste
        </button>
        <button 
          type="button" 
          onClick={() => execCommand('insertOrderedList')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Liste numérotée"
        >
          1. Liste
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => {
            const url = prompt('Entrez l\'URL du lien:')
            if (url) execCommand('createLink', url)
          }}
          className="p-1 hover:bg-gray-200 rounded"
          title="Insérer un lien"
        >
          🔗
        </button>
        <button 
          type="button" 
          onClick={() => execCommand('removeFormat')}
          className="p-1 hover:bg-gray-200 rounded"
          title="Supprimer le formatage"
        >
          Effacer
        </button>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={true}
        onInput={handleInput}
        className="p-3 overflow-auto focus:outline-none"
        style={{ height, minHeight: '200px' }}
      ></div>
    </div>
  )
}
      