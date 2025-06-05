import Link from 'next/link';
import { FiGrid, FiMusic, FiHelpCircle, FiRotateCcw, FiFilm } from 'react-icons/fi';

const photoboothLinks = [
  { href: '/photobooth-ia/admin/dashboard', label: 'Dashboard' },
  { href: '/photobooth-ia/admin/projet', label: 'Projet' },
  { href: '/photobooth-ia/admin/galerie', label: 'Galerie' },
  { href: '/photobooth-ia/admin/statistiques', label: 'Statistiques' },
];

// Ajout d'icônes et couleurs pour chaque application externe
const externalApps = [
  {
    href: process.env.NEXT_PUBLIC_PHOTO_MOSAIQUE_URL,
    label: 'Photo mosaique',
    icon: <FiGrid className="w-5 h-5" />,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300'
  },
  {
    href: process.env.NEXT_PUBLIC_KARAOKE_URL,
    label: 'Karaoke',
    icon: <FiMusic className="w-5 h-5" />,
    color: 'bg-pink-100 text-pink-700 border-pink-300'
  },
  {
    href: process.env.NEXT_PUBLIC_QUIZZ_URL,
    label: 'Quizz',
    icon: <FiHelpCircle className="w-5 h-5" />,
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  {
    href: process.env.NEXT_PUBLIC_ROUE_FORTUNE_URL,
    label: 'Roue de la fortune',
    icon: <FiRotateCcw className="w-5 h-5" />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
  },
  {
    href: process.env.NEXT_PUBLIC_FRESQUE_ANIMEE_URL,
    label: 'Fresque animée',
    icon: <FiFilm className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-700 border-purple-300'
  },
];

export default function Sidebar() {
  return (
    <nav>
      {/* Sous-menu Photobooth */}
      <div>
        <span className="font-bold text-gray-700 mb-2 block">Photobooth</span>
        <ul>
          {photoboothLinks.map(link => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
      {/* Liens vers applications externes */}
      <div className="mt-6">
        <span className="font-bold text-gray-700 mb-2 block">Applications externes</span>
        <div className="flex flex-col gap-3">
          {externalApps.map(app =>
            app.href ? (
              <a
                key={app.href}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${app.color} shadow-sm hover:scale-[1.03] transition-transform`}
                style={{ textDecoration: 'none' }}
              >
                {app.icon}
                <span className="font-medium">{app.label}</span>
              </a>
            ) : null
          )}
        </div>
      </div>
      {/* ...autres éléments du menu... */}
    </nav>
  );
}