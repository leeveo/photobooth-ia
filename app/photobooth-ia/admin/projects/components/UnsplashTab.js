'use client';

import { useState, useEffect } from 'react';

const UnsplashTab = ({ addElement }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || 'kklxbwGuaJiY_TCiq6-dkoyYfgrrnVl3aTbSyK0rbYk';

  // Function to fetch images from Unsplash
  const fetchImages = async (query = '', pageNum = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = query 
        ? `https://api.unsplash.com/search/photos?query=${query}&page=${pageNum}&per_page=12` 
        : `https://api.unsplash.com/photos?page=${pageNum}&per_page=12`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Format data based on whether it's a search or just photos
      const fetchedImages = query ? data.results : data;
      
      if (pageNum === 1) {
        setImages(fetchedImages);
      } else {
        setImages(prevImages => [...prevImages, ...fetchedImages]);
      }
      
      // Check if there are more images to load
      setHasMore(fetchedImages.length === 12);
      
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Une erreur est survenue lors de la récupération des images.');
    } finally {
      setLoading(false);
    }
  };

  // Load initial images on component mount
  useEffect(() => {
    fetchImages('', 1);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 for new searches
    fetchImages(searchQuery, 1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(searchQuery, nextPage);
  };

  const handleAddImage = (image) => {
    addElement('image', image.urls.regular, image.description || 'Unsplash Image');
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border border-gray-300 rounded-md bg-white">
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher des images..."
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
          >
            Rechercher
          </button>
        </form>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading && page === 1 ? (
          <div className="p-3 border border-gray-300 rounded-md bg-white text-center">
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : (
          <>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {images.map((image) => (
                  <div 
                    key={image.id}
                    className="relative group rounded-md overflow-hidden border border-gray-300"
                  >
                    <img
                      src={image.urls.small}
                      alt={image.description || "Unsplash image"}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleAddImage(image)}
                        className="px-3 py-1.5 bg-white text-gray-900 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
                      >
                        Ajouter
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black bg-opacity-50 text-white text-xs truncate">
                      {image.user.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 border border-gray-300 rounded-md bg-white text-center">
                <p className="text-gray-500">Aucune image trouvée</p>
              </div>
            )}
            
            {images.length > 0 && hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnsplashTab;
