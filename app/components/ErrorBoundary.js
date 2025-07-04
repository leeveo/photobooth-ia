'use client';

import { useEffect, useState } from 'react';

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    // Handler for uncaught errors
    const errorHandler = (event) => {
      console.log('Error caught by boundary:', event.error);
      setErrorDetails(event.error?.message || 'Unknown error occurred');
      setHasError(true);
      // Prevent default error handling
      event.preventDefault();
    };

    // Handler for unhandled promise rejections
    const rejectionHandler = (event) => {
      console.log('Promise rejection caught:', event.reason);
      setErrorDetails(event.reason?.message || 'Promise rejection occurred');
      setHasError(true);
      event.preventDefault();
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h2>
          <p className="mb-4 text-gray-700">{errorDetails}</p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Recharger la page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
