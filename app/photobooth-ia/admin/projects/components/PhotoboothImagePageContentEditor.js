'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PhotoboothImagePageContentEditor({ projectId }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState({
    title: 'Votre photo générée',
    text1: 'Voici votre photo générée par notre photobooth IA. Vous pouvez la télécharger ou la partager avec vos amis !',
    text2: 'Cette image est disponible pendant 7 jours. Pensez à la sauvegarder !',
    link_text: 'Visitez notre site web',
    link_url: 'https://www.leeve.fr',
    background_color: '#f5f5f5'
  });
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setError(null);
      const { data } = await supabase
        .from('photobooth_image_page_content')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (data) {
        setContent({
          title: data.title || 'Votre photo générée',
          text1: data.text1 || 'Voici votre photo générée par notre photobooth IA. Vous pouvez la télécharger ou la partager avec vos amis !',
          text2: data.text2 || 'Cette image est disponible pendant 7 jours. Pensez à la sauvegarder !',
          link_text: data.link_text || 'Visitez notre site web',
          link_url: data.link_url || 'https://www.leeve.fr',
          background_color: data.background_color || '#f5f5f5'
        });
      }
      setLoading(false);
    }
    if (projectId) fetchContent();
  }, [projectId, supabase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Vérifie si une entrée existe déjà
    const { data: existing } = await supabase
      .from('photobooth_image_page_content')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing?.id) {
      // Update
      const { error } = await supabase
        .from('photobooth_image_page_content')
        .update(content)
        .eq('id', existing.id);
      if (error) setError("Erreur lors de la mise à jour.");
      else setSuccess("Contenu mis à jour !");
    } else {
      // Insert
      const { error } = await supabase
        .from('photobooth_image_page_content')
        .insert({ ...content, project_id: projectId });
      if (error) setError("Erreur lors de la création.");
      else setSuccess("Contenu créé !");
    }
    setLoading(false);
  };

  // Aperçu smartphone : même design que /image
  const phoneFrameStyle = {
    width: 340,
    height: 700,
    borderRadius: 40,
    border: '12px solid #222',
    boxShadow: '0 8px 32px #0004',
    background: '#222',
    position: 'relative',
    overflow: 'hidden',
    margin: 'auto'
  };

  const screenStyle = {
    position: 'absolute',
    top: 18,
    left: 12,
    right: 12,
    bottom: 18,
    borderRadius: 28,
    background: content.background_color,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 18px'
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
      <h3 className="text-xl font-bold mb-6">Personnalisation de la Landing page</h3>
      {/* Texte d'explication sous le titre */}
      <div className="mb-6">
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <h4 className="text-lg font-semibold text-indigo-700 mb-2">À quoi sert cette page ?</h4>
          <p className="text-gray-500 text-sm mb-2">
            Cette page permet à vos utilisateurs de récupérer leur photo générée par le photobooth IA.
            <br />
            Ils peuvent visualiser leur image, la télécharger, et la partager facilement sur les réseaux sociaux.
            <br />
            Vous pouvez personnaliser ici le texte, les couleurs et le lien affichés sur cette page pour offrir une expérience sur-mesure à vos participants.
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Colonne gauche : Inputs */}
        <form onSubmit={handleSave} className="flex-1 space-y-6">
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Titre</label>
            <input
              type="text"
              name="title"
              value={content.title}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 font-semibold"
              required
              placeholder="Votre photo générée"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              name="text1"
              value={content.text1}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
              rows={3}
              required
              placeholder="Voici votre photo générée par notre photobooth IA. Vous pouvez la télécharger ou la partager avec vos amis !"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Texte sous l'image</label>
            <textarea
              name="text2"
              value={content.text2}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
              rows={2}
              required
              placeholder="Cette image est disponible pendant 7 jours. Pensez à la sauvegarder !"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Texte du lien</label>
            <input
              type="text"
              name="link_text"
              value={content.link_text}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
              required
              placeholder="Visitez notre site web"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">URL du lien</label>
            <input
              type="url"
              name="link_url"
              value={content.link_url}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
              required
              placeholder="https://www.waibooth.app"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Couleur de fond</label>
            <input
              type="color"
              name="background_color"
              value={content.background_color}
              onChange={handleChange}
              className="h-12 w-24 rounded-lg border-2 border-indigo-200 shadow"
            />
          </div>
          <div className="flex gap-4 items-center mt-6">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
            {success && <span className="text-green-600 font-semibold">{success}</span>}
            {error && <span className="text-red-600 font-semibold">{error}</span>}
          </div>
        </form>
        {/* Colonne droite : Aperçu smartphone */}
        <div className="flex-1 flex items-center justify-center">
          <div style={{ position: 'relative', width: 320, height: 700 }}>
            {/* Smartphone PNG frame as background */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 320,
                height: 740,
                zIndex: 2,
                pointerEvents: 'none',
                backgroundImage: 'url("https://leeveostockage.s3.eu-west-3.amazonaws.com/photobooth_UI/smartphone.png")',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
            />
            {/* Screen content */}
            <div
              style={{
                position: 'absolute',
                top: 44,
                left: 10,
                width: 296,
                height: 646,
                borderRadius: 28,
                background: content.background_color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '24px 12px',
                zIndex: 0,
                boxShadow: '0 2px 16px #6366f133',
                overflow: 'hidden'
              }}
            >
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                margin: '0 0 8px 0',
                textAlign: 'center',
                textShadow: '0 2px 8px #6366f155',
                color: '#4f46e5'
              }}>
                {content.title}
              </h1>
              <p style={{
                fontSize: '1.05rem',
                margin: '0 0 8px 0',
                textAlign: 'center',
                color: '#444'
              }}>
                {content.text1}
              </p>
              <div style={{
                width: '100%',
                aspectRatio: '9/16',
                maxHeight: 180,
                background: '#fff',
                borderRadius: 16,
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '4px solid #e0e7ff'
              }}>
                <img
                  src="https://leeveostockage.s3.eu-west-3.amazonaws.com/style/womens_vintage_waves.jpg"
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                />
              </div>
              <p style={{
                fontSize: '1rem',
                margin: '0 0 8px 0',
                textAlign: 'center',
                color: '#666'
              }}>
                {content.text2}
              </p>
              {/* Bouton Télécharger ma photo */}
              <a
                href="#"
                download
                style={{
                  display: 'inline-block',
                  padding: '12px 28px',
                  borderRadius: 28,
                  background: 'linear-gradient(90deg,#6366f1,#a78bfa)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  textDecoration: 'none',
                  boxShadow: '0 2px 12px #6366f155',
                  margin: '0 0 8px 0'
                }}
              >
                Télécharger ma photo
              </a>
              {/* Boutons de partage réseaux sociaux */}
              <div style={{ display: 'flex', gap: '12px', margin: '0 0 8px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Facebook */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px #2563eb33'
                  }}
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0"></path></svg>
                </a>
                {/* Instagram */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg,#ec4899,#f59e42,#fbbf24)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px #ec489933'
                  }}
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.974-1.246-2.242-1.308-3.608C2.175 15.668 2 16.077 2 12c0-5.923.013-6.332.072-7.612.059-1.28.324-2.392 1.306-3.374.981-.982 2.093-1.247 3.374-1.306C8.332 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.396 3.678 1.378c-.982.982-1.247 2.094-1.306 3.374C2.013 5.668 2 6.077 2 12c0 5.923.013 6.332.072 7.612.059 1.28.324 2.392 1.306 3.374.981.982 2.093 1.247 3.374 1.306C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.281-.059 2.393-.324 3.374-1.306.982-.982 1.247-2.094 1.306-3.374.059-1.28.072-1.689.072-7.612 0-5.923-.013-6.332-.072-7.612-.059-1.28-.324-2.392-1.306-3.374-.981-.982-2.093-1.247-3.374-1.306C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"></path></svg>
                </a>
                {/* X (Twitter) */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    background: '#000',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px #0003'
                  }}
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.53 7.477l-4.477 4.477 6.477 6.477h-2.477l-5.477-5.477-4.477 4.477h-2.477l6.477-6.477-6.477-6.477h2.477l5.477 5.477 4.477-4.477z"></path></svg>
                </a>
              </div>
              {/* Texte avec lien externe EN BAS DU PREVIEW */}
              <div style={{
                width: '100%',
                marginTop: 'auto',
                paddingTop: 12,
                paddingBottom: 4,
                textAlign: 'center'
              }}>
                <p className="text-sm text-gray-500 text-center" style={{
                  fontSize: '0.95rem',
                  color: '#555'
                }}>
                  {content.link_text}&nbsp;
                  <a
                    href={content.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#4f46e5',
                      textDecoration: 'underline',
                      fontWeight: 600
                    }}
                  >
                    {content.link_url}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}