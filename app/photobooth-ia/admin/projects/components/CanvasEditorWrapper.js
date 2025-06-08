'use client';

import { useState, useEffect } from 'react';

// This wrapper component handles the loading of CanvasEditor with version compatibility
export default function CanvasEditorWrapper(props) {
  const [error, setError] = useState(null);
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    // Dynamically import the component
    import('./CanvasEditor')
      .then((module) => {
        setComponent(() => module.default);
      })
      .catch((err) => {
        console.error('Error loading CanvasEditor:', err);
        setError(err.message || 'Failed to load editor component');
      });
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Failed to load Canvas Editor: {error}
            </p>
            <p className="text-sm text-red-700 mt-2">
              Please run: <code className="bg-red-100 px-1 py-0.5 rounded">npm install react-konva@18.2.10 konva@9.2.3</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">Chargement de l'éditeur...</span>
      </div>
    );
  }

  return <Component {...props} />;
}
