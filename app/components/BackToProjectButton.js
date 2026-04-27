/**
 * BackToProjectButton - Bouton de retour vers la page d'accueil du projet
 * 
 * Ce composant affiche un bouton flottant en haut à gauche permettant
 * de revenir à la page d'accueil du projet depuis la page cam.
 * 
 * @param {string} projectSlug - Le slug du projet (ex: "cafe-oz")
 * @param {string} photoboothType - Le type de photobooth (ex: "photobooth-premium")
 * @param {string} primaryColor - Couleur primaire du projet (optionnel)
 * @param {string} secondaryColor - Couleur secondaire du projet (optionnel)
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiHome } from 'react-icons/fi';

export default function BackToProjectButton({ 
  projectSlug, 
  photoboothType = 'photobooth-premium',
  primaryColor = '#811A53',
  secondaryColor = '#E5E40A'
}) {
  const projectUrl = `/${photoboothType}/${projectSlug}`;

  return (
    <Link href={projectUrl}>
      <motion.button
        className="fixed top-4 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}dd 0%, ${primaryColor}99 100%)`,
          boxShadow: `
            0 10px 30px rgba(0, 0, 0, 0.3),
            0 0 20px ${primaryColor}40,
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        whileHover={{
          boxShadow: `
            0 15px 40px rgba(0, 0, 0, 0.4),
            0 0 30px ${primaryColor}60,
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
          `
        }}
        title="Retour à l'accueil du projet"
      >
        <FiArrowLeft className="w-5 h-5" />
        <span className="hidden sm:inline">Retour</span>
        <FiHome className="w-4 h-4 opacity-70" />
      </motion.button>
    </Link>
  );
}
