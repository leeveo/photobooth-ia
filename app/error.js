'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Quelque chose s'est mal passé</h2>
            <p className="text-gray-700 mb-6">
              {error?.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => reset()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
              <Link 
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-center"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
