'use client';

import { useEffect } from 'react';

export default function EmergencyLogout() {
  useEffect(() => {
    // Auto-exécution du nettoyage d'urgence
    const emergencyCleanup = () => {
      console.log('🚨 DÉCONNEXION D\'URGENCE ACTIVÉE');
      
      try {
        // Vider TOUT brutalement
        localStorage.clear();
        sessionStorage.clear();
        
        // Supprimer TOUS les cookies du domaine
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('✅ Nettoyage d\'urgence terminé');
        
        // Redirection immédiate
        setTimeout(() => {
          window.location.replace('/photobooth-ia/admin/login?emergency=true');
        }, 50);
        
      } catch (error) {
        console.error('❌ Erreur nettoyage d\'urgence:', error);
        // Redirection même en cas d'erreur
        window.location.replace('/photobooth-ia/admin/login?emergency=true');
      }
    };

    // Lancer le nettoyage d'urgence
    emergencyCleanup();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800 text-white">
      <div className="text-center max-w-md">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8">
          {/* Spinner de chargement */}
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6"></div>
          
          <h1 className="text-3xl font-bold mb-4">🚨 Déconnexion d'Urgence</h1>
          <p className="text-white/80 mb-4">Nettoyage complet en cours...</p>
          <p className="text-white/60 text-sm">
            Redirection automatique vers la page de connexion.
          </p>
        </div>
      </div>
    </div>
  );
}