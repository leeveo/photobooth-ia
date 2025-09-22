'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import styleTemplateDataCoiffure from '../app/photobooth-ia/admin/components/styleTemplateDataCoifure.json';

export default function HairstyleShowcase() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentGender, setCurrentGender] = useState('femme');
  
  // Extraire les styles selon le genre sélectionné
  const getStylesByGender = (gender) => {
    const allStyles = [];
    styleTemplateDataCoiffure.forEach(category => {
      if (category.styles) {
        const filteredStyles = category.styles.filter(style => style.gender === gender);
        allStyles.push(...filteredStyles);
      }
    });
    return allStyles.slice(0, 12); // Limiter à 12 styles pour l'affichage
  };

  const [displayedStyles, setDisplayedStyles] = useState(() => getStylesByGender('femme'));

  useEffect(() => {
    setDisplayedStyles(getStylesByGender(currentGender));
    setCurrentSlide(0);
  }, [currentGender]);

  // Auto-slide functionality
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.ceil(displayedStyles.length / 4));
    }, 4000);

    return () => clearInterval(timer);
  }, [displayedStyles.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(displayedStyles.length / 4));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.ceil(displayedStyles.length / 4) - 1 : prev - 1
    );
  };

  const visibleStyles = displayedStyles.slice(currentSlide * 4, (currentSlide + 1) * 4);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
           Changement de coiffure par IA
        </h3>
        <p className="text-gray-600">
          Transformez votre look avec plus de 40 styles de coiffures différents grâce à l'intelligence artificielle
        </p>
      </div>

      {/* Sélecteur de genre */}
      <div className="flex justify-center mb-6">
        <div className="bg-white rounded-full p-1 shadow-inner">
          <button
            onClick={() => setCurrentGender('femme')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              currentGender === 'femme'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'text-purple-500 hover:bg-purple-50'
            }`}
          >
            👩 Femmes
          </button>
          <button
            onClick={() => setCurrentGender('homme')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              currentGender === 'homme'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'text-purple-500 hover:bg-purple-50'
            }`}
          >
            👨 Hommes
          </button>
        </div>
      </div>

      {/* Slider des styles */}
      <div className="relative">
        <div className="overflow-hidden rounded-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleStyles.map((style, index) => (
              <div key={`${style.style_key}-${index}`} className="group relative">
                <div className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <Image
                    src={style.preview_image}
                    alt={style.name}
                    fill
                    className="object-cover transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h4 className="font-semibold text-sm">{style.name}</h4>
                    <p className="text-xs opacity-90">{style.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {Math.ceil(displayedStyles.length / 4) > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
            >
              <RiArrowLeftSLine className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
            >
              <RiArrowRightSLine className="w-5 h-5 text-gray-600" />
            </button>
          </>
        )}

        {/* Dots indicator */}
        <div className="flex justify-center space-x-2 mt-4">
          {Array.from({ length: Math.ceil(displayedStyles.length / 4) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentSlide
                  ? 'bg-purple-500 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center mt-6">
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              IA Avancée
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
              Résultat Instantané
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-purple-400 rounded-full mr-2"></span>
              40+ Styles
            </div>
          </div>
        </div>
        
        <Link
          href="/photobooth-ia/admin/projects/create"
          className="inline-flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          ✨ Essayer maintenant
          <RiArrowRightSLine className="w-5 h-5 ml-2" />
        </Link>
      </div>
    </div>
  );
}