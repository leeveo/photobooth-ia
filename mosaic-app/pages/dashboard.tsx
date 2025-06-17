import { useSharedAuth } from '../hooks/useSharedAuth';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { user, loading } = useSharedAuth();
  const [showCookieNotice, setShowCookieNotice] = useState(false);
  
  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu la notification
    const hasSeen = localStorage.getItem('cookie_notice_seen');
    if (!hasSeen && user) {
      setShowCookieNotice(true);
    }
  }, [user]);
  
  const acceptCookieNotice = () => {
    localStorage.setItem('cookie_notice_seen', 'true');
    setShowCookieNotice(false);
  };
  
  if (loading) {
    return <div>Chargement...</div>;
  }
  
  if (!user) {
    return <div>Non autorisé</div>;
  }
  
  return (
    <div>
      {showCookieNotice && (
        <div className="cookie-notice">
          <p>Pour faciliter votre navigation entre nos applications, nous utilisons un cookie d'authentification partagée.</p>
          <button onClick={acceptCookieNotice}>J'ai compris</button>
        </div>
      )}
      <h1>Tableau de bord</h1>
      <p>Bonjour, {user.email}</p>
      {/* Le reste de votre interface */}
    </div>
  );
}
