'use client';

import { useState, useEffect } from 'react';

export default function ClientErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle window errors
    const handleError = (event) => {
      console.log('Error caught by boundary:', event.error);
      setError(event.error?.toString() || 'Unknown error');
      setHasError(true);
      // Prevent default error behavior
      event.preventDefault();
    };

    // Handle unhandled promise rejections
    const handleRejection = (event) => {
      console.log('Promise rejection caught:', event.reason);
      setError(event.reason?.toString() || 'Promise rejection');
      setHasError(true);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex gap-2">
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
