"use client";

import { useState } from 'react';
import LoadingSpinnerCoiffure from './LoadingSpinnerCoiffure';
import SimpleCoiffureSpinner from './SimpleCoiffureSpinner';

export default function SpinnerDemo() {
  const [activeSpinner, setActiveSpinner] = useState('full');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Loading Spinners Coiffure - Demo
        </h1>
        
        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setActiveSpinner('full')}
            className={`px-4 py-2 rounded-md ${
              activeSpinner === 'full' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border'
            }`}
          >
            Loading Complet
          </button>
          <button
            onClick={() => setActiveSpinner('simple')}
            className={`px-4 py-2 rounded-md ${
              activeSpinner === 'simple' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border'
            }`}
          >
            Loading Simple
          </button>
        </div>

        {/* Spinner Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
          {activeSpinner === 'full' && (
            <LoadingSpinnerCoiffure 
              message="Transformation de votre style en cours..."
              size="large"
              primaryColor="#811A53"
              secondaryColor="#E5E40A"
              accentColor="#C4A484"
            />
          )}
          
          {activeSpinner === 'simple' && (
            <SimpleCoiffureSpinner 
              primaryColor="#811A53"
              secondaryColor="#E5E40A"
            />
          )}
        </div>

        {/* Size variants for LoadingSpinnerCoiffure */}
        {activeSpinner === 'full' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 h-64 flex items-center justify-center">
              <div>
                <h3 className="text-center mb-4 font-semibold">Small</h3>
                <LoadingSpinnerCoiffure 
                  size="small"
                  message="Petit..."
                  primaryColor="#811A53"
                  secondaryColor="#E5E40A"
                  accentColor="#C4A484"
                />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 h-64 flex items-center justify-center">
              <div>
                <h3 className="text-center mb-4 font-semibold">Medium</h3>
                <LoadingSpinnerCoiffure 
                  size="medium"
                  message="Moyen..."
                  primaryColor="#811A53"
                  secondaryColor="#E5E40A"
                  accentColor="#C4A484"
                />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 h-64 flex items-center justify-center">
              <div>
                <h3 className="text-center mb-4 font-semibold">Large</h3>
                <LoadingSpinnerCoiffure 
                  size="large"
                  message="Grand..."
                  primaryColor="#811A53"
                  secondaryColor="#E5E40A"
                  accentColor="#C4A484"
                />
              </div>
            </div>
          </div>
        )}

        {/* Color variants */}
        <div className="mt-8 bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Variantes de couleurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 flex items-center justify-center border rounded-lg">
              <SimpleCoiffureSpinner 
                primaryColor="#2563eb"
                secondaryColor="#f59e0b"
              />
            </div>
            <div className="h-32 flex items-center justify-center border rounded-lg">
              <SimpleCoiffureSpinner 
                primaryColor="#dc2626"
                secondaryColor="#10b981"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
