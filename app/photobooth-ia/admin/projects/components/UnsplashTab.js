'use client';

import { useState, useEffect, useCallback } from 'react';

const UnsplashTab = ({ addElement }) => {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Clé d'API Unsplash depuis les variables d'environnement
  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  // Fonction pour charger les images populaires au chargement
  const loadPopularImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `https://api.unsplash.com/photos?page=1&per_page=20&order_by=popular`,
        {
          headers: {
            Authorization: `Client-ID ${accessKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des images populaires');
      }
      
      const data = await response.json();
      setImages(data);
      setHasMore(data.length === 20);
      setLoading(false);
    } catch (err) {
      console.error('Erreur Unsplash:', err);
      setError('Impossible de charger les images. Veuillez réessayer plus tard.');
      setLoading(false);
    }
  }, [accessKey]);

  // Chargement initial des images populaires
  useEffect(() => {
    loadPopularImages();
  }, [loadPopularImages]);

  // Fonction de recherche
  const searchImages = useCallback(async (searchQuery, pageNum = 1) => {
    if (!searchQuery.trim()) {
      return loadPopularImages();
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&per_page=20`,
        {
          headers: {
            Authorization: `Client-ID ${accessKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche d\'images');
      }
      
      const data = await response.json();
      
      // Si c'est la première page, on remplace les images
      // Sinon, on ajoute les nouvelles images à la liste existante
      if (pageNum === 1) {
        setImages(data.results);
        setTotalResults(data.total);
      } else {
        setImages(prevImages => [...prevImages, ...data.results]);
      }
      
      setHasMore(data.total > pageNum * 20);
      setPage(pageNum);
      setLoading(false);
    } catch (err) {
      console.error('Erreur Unsplash:', err);
      setError('Impossible de rechercher des images. Veuillez réessayer plus tard.');
      setLoading(false);
    }
  }, [accessKey, loadPopularImages]);

  // Gestionnaire de soumission du formulaire de recherche
  const handleSubmit = (e) => {
    e.preventDefault();
    searchImages(query);
  };

  // Charger plus d'images
  const loadMore = () => {
    if (query.trim()) {
      searchImages(query, page + 1);
    } else {
      // Pour les images populaires, charger la page suivante
      loadMorePopular();
    }
  };

  // Charger plus d'images populaires
  const loadMorePopular = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `https://api.unsplash.com/photos?page=${page + 1}&per_page=20&order_by=popular`,
        {
          headers: {
            Authorization: `Client-ID ${accessKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de plus d\'images');
      }
      
      const data = await response.json();
      setImages(prevImages => [...prevImages, ...data]);
      setHasMore(data.length === 20);
      setPage(prevPage => prevPage + 1);
      setLoading(false);
    } catch (err) {
      console.error('Erreur Unsplash:', err);
      setError('Impossible de charger plus d\'images. Veuillez réessayer plus tard.');
      setLoading(false);
    }
  };

  // Ajouter l'image sélectionnée au canvas
  const addImageToCanvas = (image) => {
    // Nous utilisons l'URL regular qui est de bonne qualité sans être trop lourde
    addElement('image', image.urls.regular, `Unsplash par ${image.user.name}`);
    
    // Enregistrer une vue (obligatoire selon les conditions d'utilisation d'Unsplash)
    fetch(`https://api.unsplash.com/photos/${image.id}/download`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`
      }
    }).catch(err => console.error('Erreur lors de l\'enregistrement de vue:', err));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Images Unsplash</h4>
      
      {/* Formulaire de recherche */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des images..."
            className="flex-grow rounded-l-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>
      
      {/* Affichage du nombre de résultats */}
      {query.trim() && (
        <div className="text-sm text-gray-500 mb-2">
          {totalResults} résultats pour "{query}"
        </div>
      )}
      
      {/* Message d'erreur */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 mb-4">
          {error}
        </div>
      )}
      
      {/* Grille d'images */}
      <div className="grid grid-cols-2 gap-3">
        {images.map((image) => (
          <div 
            key={image.id} 
            className={`relative group overflow-hidden rounded-md border ${selectedImage === image.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-gray-200'}`}
            onClick={() => setSelectedImage(image.id)}
          >
            <div className="aspect-w-16 aspect-h-9 bg-gray-100">
              <img 
                src={image.urls.small} 
                alt={image.alt_description || 'Unsplash image'} 
                className="object-cover w-full h-full transition-all duration-300 group-hover:scale-105"
              />
              
              {/* Overlay avec le nom du photographe */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white truncate">
                  Par {image.user.name}
                </p>
              </div>
              
              {/* Bouton d'ajout au survol */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addImageToCanvas(image);
                  }}
                  className="px-3 py-1.5 bg-white text-gray-800 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Ajouter au canvas
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Indicateur de chargement */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        </div>
      )}
      
      {/* Bouton "Charger plus" */}
      {hasMore && !loading && images.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Charger plus d'images
          </button>
        </div>
      )}
      
      {/* Note d'attribution */}
      <div className="text-xs text-gray-500 mt-4 flex items-center">
        <span>Photos par</span>
        <a 
          href="https://unsplash.com/?utm_source=photobooth-ia&utm_medium=referral" 
          target="_blank" 
          rel="noopener noreferrer"
          className="ml-1 font-medium text-gray-700 hover:text-indigo-600"
        >
          Unsplash
        </a>
      </div>
      
      {/* Avertissement de sélection */}
      {selectedImage && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-md shadow-lg animate-fadeIn max-w-xs">
          <p className="text-sm">
            Image sélectionnée ! Cliquez sur "Ajouter au canvas" pour l'utiliser.
          </p>
        </div>
      )}
    </div>
  );
};

export default UnsplashTab;
