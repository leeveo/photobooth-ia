'use client';

import { useState, useEffect } from 'react';

const UnsplashTab = ({ addElement }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  // Dummy data for demonstration (since actual Unsplash API requires a key)
  const dummyUnsplashImages = [
    {
      id: 'unsplash-1',
      description: 'Nature landscape',
      urls: {
        small: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bmF0dXJlfGVufDB8fDB8fHww',
        regular: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bmF0dXJlfGVufDB8fDB8fHww',
      },
      user: { name: 'John Doe' }
    },
    {
      id: 'unsplash-2',
      description: 'Mountain view',
      urls: {
        small: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bmF0dXJlfGVufDB8fDB8fHww',
        regular: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bmF0dXJlfGVufDB8fDB8fHww',
      },
      user: { name: 'Jane Smith' }
    },
    {
      id: 'unsplash-3',
      description: 'Ocean sunset',
      urls: {
        small: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D',
        regular: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D',
      },
      user: { name: 'Alex Brown' }
    },
    {
      id: 'unsplash-4',
      description: 'Forest path',
      urls: {
        small: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D',
        regular: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D',
      },
      user: { name: 'Sarah Williams' }
    }
  ];

  // Simulate search functionality with dummy data
  const searchImages = () => {
    setLoading(true);
    setError(null);
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        // Filter dummy images based on search query (case insensitive)
        const filteredImages = searchQuery
          ? dummyUnsplashImages.filter(img => 
              img.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : dummyUnsplashImages;
        
        setImages(filteredImages);
        setLoading(false);
      } catch (err) {
        setError('Une erreur est survenue lors de la recherche d\'images.');
        setLoading(false);
      }
    }, 800);
  };

  // Load initial images
  useEffect(() => {
    setImages(dummyUnsplashImages);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    searchImages();
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
        {loading ? (
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
          </>
        )}
      </div>
    </div>
  );
};

export default UnsplashTab;
