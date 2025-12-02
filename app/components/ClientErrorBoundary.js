'use client';

import { useState, useEffect } from 'react';

// ✅ GLOBAL CONSOLE SUPPRESSION FOR SUPABASE COOKIE ERRORS
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter Supabase cookie errors
    const isCookieError = args.some(arg => {
      const str = String(arg);
      return str.includes('Failed to parse cookie string') || 
             str.includes('base64-eyJ');
    });

    if (isCookieError) return;
    
    originalConsoleError.apply(console, args);
  };
}

export default function ClientErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅ ATTEMPT TO CLEANUP CORRUPTED COOKIES
    try {
      if (document.cookie) {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const parts = cookie.split('=');
          const name = parts[0] ? parts[0].trim() : '';
          const value = parts.slice(1).join('=').trim();
          
          // Check for Supabase cookies that might be corrupted (starting with base64- or invalid JSON)
          if (name && (name.includes('sb-') || name.includes('supabase')) && value) {
             // If it looks like the problematic base64 string or isn't valid JSON/URI-encoded JSON
             if (value.startsWith('base64-') || (value.startsWith('"base64-'))) {
               // Delete the cookie
               document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
               document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`;
               // console.log(`🧹 Cleaned up corrupted cookie: ${name}`);
             }
          }
        });
      }
    } catch (e) {
      // ignore cookie cleanup errors
    }

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
