'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine, RiCheckboxCircleLine, RiInformationLine } from 'react-icons/ri';

/**
 * Composant de sélection de templates de styles prédéfinis
 */
export default function StyleTemplates({ projectId, photoboothType, onStylesAdded, onError }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // Nouvel état pour le popup de détails
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  // État pour stocker les styles avec les genres sélectionnés
  const [templateStyles, setTemplateStyles] = useState([]);
  // Nouvel état pour les styles sélectionnés
  const [selectedStyles, setSelectedStyles] = useState([]);

  // Helper function to determine tags for a specific style
  const getTagsForStyle = (templateId, styleName) => {
    // Default tags for all styles
    const defaultTags = ["homme", "femme", "groupe"];
    
    // Collections that don't support group photos - removed "cartoon" from this list
    const noGroupCollections = ["sciencefiction", "digital", "medieval", "post-apocalyptic"];
    
    // Return ["homme", "femme"] for styles in these collections, default tags otherwise
    if (noGroupCollections.includes(templateId)) {
      return ["homme", "femme"];
    }
    
    return defaultTags;
  };

  // Définition des templates de styles
  const styleTemplates = [
    {
      id: 'paint-magic',
      name: 'Collection Paint Magic',
      description: 'Tous les styles de peinture ,des couleurs éclatantes et des motifs uniques',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/paint-magic.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Peinture à l\'huile',
          gender: 'g',
          style_key: 'oil_painting',
          description: 'Style peinture à l\'huile impressionniste',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/oil-painting.jpg',
          prompt: 'Transform this portrait into an impressionist oil painting with vibrant colors and visible brushstrokes',
          variations: 1
        },
        {
          name: 'Aquarelle',
          gender: 'g',
          style_key: 'watercolor',
          description: 'Style aquarelle doux et fluide',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/watercolor.jpg',
          prompt: 'Transform this portrait into a delicate watercolor painting with soft edges and flowing colors',
          variations: 1
        },
        {
          name: 'Pop Art',
          gender: 'g',
          style_key: 'pop_art',
          description: 'Style pop art à la Andy Warhol',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/pop-art.jpg',
          prompt: 'Transform this portrait into a vibrant pop art style like Andy Warhol, with bold colors and strong contrasts',
          variations: 1
        },
        // New styles start here
        {
          name: 'Cubisme',
          gender: 'g',
          style_key: 'cubism',
          description: 'Style cubiste à la Picasso',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cubism.jpg',
          prompt: 'Transform this portrait into a cubist painting in the style of Picasso, with geometric shapes and multiple perspectives.',
          variations: 1
        },
        {
          name: 'Surréalisme',
          gender: 'g',
          style_key: 'surrealism',
          description: 'Style surréaliste inspiré par Salvador Dalí',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/surrealism.jpg',
          prompt: 'Transform this portrait into a surrealist painting inspired by Salvador Dalí, with dreamlike distortions and symbolic imagery.',
          variations: 1
        },
        {
          name: 'Baroque',
          gender: 'g',
          style_key: 'baroque',
          description: 'Style baroque avec éclairage dramatique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/baroque.jpg',
          prompt: 'Transform this portrait into a baroque painting, with dramatic lighting, rich textures, and emotional intensity.',
          variations: 1
        },
        {
          name: 'Renaissance',
          gender: 'g',
          style_key: 'renaissance',
          description: 'Style renaissance avec proportions réalistes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/renaissance.jpg',
          prompt: 'Transform this portrait into a renaissance-style painting with realistic proportions, fine details, and a classical atmosphere.',
          variations: 1
        },
        {
          name: 'Pointillisme',
          gender: 'g',
          style_key: 'pointillism',
          description: 'Style pointilliste à la Seurat',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/pointillism.jpg',
          prompt: 'Transform this portrait into a pointillist painting using tiny colored dots to create form and light, like Georges Seurat.',
          variations: 1
        },
        {
          name: 'Fauvisme',
          gender: 'g',
          style_key: 'fauvism',
          description: 'Style fauviste avec couleurs expressives',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fauvism.jpg',
          prompt: 'Transform this portrait into a fauvist painting with wild brushstrokes and unnatural, expressive colors.',
          variations: 1
        },
        {
          name: 'Expressionnisme Abstrait',
          gender: 'g',
          style_key: 'abstract_expressionism',
          description: 'Style expressionniste avec texture audacieuse',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/abstract_expressionism.jpg',
          prompt: 'Transform this portrait into an abstract expressionist painting with chaotic motion, heavy texture, and bold emotion.',
          variations: 1
        },
        {
          name: 'Clair-obscur',
          gender: 'g',
          style_key: 'chiaroscuro',
          description: 'Style clair-obscur avec forts contrastes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/chiaroscuro.jpg',
          prompt: 'Transform this portrait into a chiaroscuro-style painting with strong contrasts between light and dark.',
          variations: 1
        },
        {
          name: 'Lavis d\'Encre',
          gender: 'g',
          style_key: 'ink_wash',
          description: 'Style minimaliste à l\'encre asiatique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/ink_wash.jpg',
          prompt: 'Transform this portrait into a minimalistic ink wash painting in the style of East Asian brush art.',
          variations: 1
        },
        {
          name: 'Romantisme',
          gender: 'g',
          style_key: 'romanticism',
          description: 'Style romantique avec lumière douce',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/romanticism.jpg',
          prompt: 'Transform this portrait into a romanticism-inspired painting with soft light, rich emotion, and dramatic scenery.',
          variations: 1
        },
        {
          name: 'Symbolisme',
          gender: 'g',
          style_key: 'symbolism',
          description: 'Style symboliste avec formes mystérieuses',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/symbolism.jpg',
          prompt: 'Transform this portrait into a symbolist painting filled with mysterious forms and mythological references.',
          variations: 1
        },
        {
          name: 'Gothique',
          gender: 'g',
          style_key: 'gothic',
          description: 'Style gothique avec tons sombres',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/gothic.jpg',
          prompt: 'Transform this portrait into a gothic-style painting with dark tones, rich ornamentation, and medieval elements.',
          variations: 1
        },
        {
          name: 'Art Naïf',
          gender: 'g',
          style_key: 'naive_art',
          description: 'Style naïf avec perspective plate',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/naive_art.jpg',
          prompt: 'Transform this portrait into a naive art painting with flat perspective, vivid colors, and childlike charm.',
          variations: 1
        },
        {
          name: 'Art Nouveau',
          gender: 'g',
          style_key: 'art_nouveau',
          description: 'Style Art Nouveau avec lignes élégantes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/art_nouveau.jpg',
          prompt: 'Transform this portrait into an art nouveau painting with elegant lines, floral patterns, and graceful curves.',
          variations: 1
        },
        {
          name: 'Réalisme',
          gender: 'g',
          style_key: 'realism',
          description: 'Style réaliste avec détails minutieux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/realism.jpg',
          prompt: 'Transform this portrait into a realist painting with meticulous attention to detail and natural lighting.',
          variations: 1
        },
        {
          name: 'Art Glitch',
          gender: 'g',
          style_key: 'glitch_art',
          description: 'Style glitch art numérique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/glitch_art.jpg',
          prompt: 'Transform this portrait into a digital glitch art style painting, blending classical form with pixelated distortion.',
          variations: 1
        },
        {
          name: 'Fresque',
          gender: 'g',
          style_key: 'fresco',
          description: 'Style fresque avec tons terreux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fresco.jpg',
          prompt: 'Transform this portrait into a fresco-style painting with muted earth tones and a weathered texture like old murals.',
          variations: 1
        },
        {
          name: 'Art Déco',
          gender: 'g',
          style_key: 'art_deco',
          description: 'Style Art Déco avec symétrie géométrique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/art_deco.jpg',
          prompt: 'Transform this portrait into a deco-style painting with geometric symmetry, clean lines, and metallic accents.',
          variations: 1
        },
        {
          name: 'Tachisme',
          gender: 'g',
          style_key: 'tachisme',
          description: 'Style tachisme avec coups de pinceau spontanés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/tachisme.jpg',
          prompt: 'Transform this portrait into a tachisme (European abstract) painting with spontaneous brushwork and color stains.',
          variations: 1
        },
        {
          name: 'Street Art',
          gender: 'g',
          style_key: 'street_art',
          description: 'Style Street Art contemporain',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/street_art.jpg',
          prompt: 'Transform this portrait into a contemporary street art painting, combining graffiti textures with vibrant spray-paint effects.',
          variations: 1
        }
      ]
    },
    {
      id: 'sciencefiction',
      name: 'Collection Science Fiction',
      description: 'Styles futuristes et de science-fiction',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/sciencefiction.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Capitaine de Vaisseau',
          gender: 'g',
          style_key: 'starship_captain',
          description: 'Style capitaine avec uniforme futuriste',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/starship_captain.jpg',
          prompt: 'Transform this portrait into a starship captain with a sleek uniform, a glowing HUD interface, and a galaxy behind them.',
          variations: 1
        },
        {
          name: 'Chasseur de Primes Spatial',
          gender: 'g',
          style_key: 'space_bounty_hunter',
          description: 'Style chasseur de primes avec casque et arme',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/space_bounty_hunter.jpg',
          prompt: 'Transform this portrait into a space bounty hunter with a helmet, energy rifle, and a neon-lit spaceport.',
          variations: 1
        },
        {
          name: 'Diplomate Alien',
          gender: 'g',
          style_key: 'alien_diplomat',
          description: 'Style diplomate alien avec peau bioluminescente',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/alien_diplomat.jpg',
          prompt: 'Transform this portrait into an alien diplomat with bioluminescent skin, elegant attire, and a star council setting.',
          variations: 1
        },
        {
          name: 'Soldat Cybernétique',
          gender: 'g',
          style_key: 'cybernetic_soldier',
          description: 'Style soldat avec améliorations cybernétiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cybernetic_soldier.jpg',
          prompt: 'Transform this portrait into a cybernetically enhanced soldier with robotic limbs and a gritty war-torn background.',
          variations: 1
        },
        {
          name: 'Contrebandier Spatial',
          gender: 'g',
          style_key: 'sci_fi_smuggler',
          description: 'Style contrebandier avec veste en cuir',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/sci_fi_smuggler.jpg',
          prompt: 'Transform this portrait into a sci-fi smuggler with a leather jacket, goggles, and a junker spaceship docked nearby.',
          variations: 1
        },
        {
          name: 'Hacker Rebelle',
          gender: 'g',
          style_key: 'rebel_hacker',
          description: 'Style hacker entouré de code et hologrammes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/rebel_hacker.jpg',
          prompt: 'Transform this portrait into a rebel hacker from a galactic resistance, surrounded by code and holograms.',
          variations: 1
        },
        {
          name: 'Humanoïde IA',
          gender: 'g',
          style_key: 'ai_humanoid',
          description: 'Style androïde synthétique avec design chromé',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/ai_humanoid.jpg',
          prompt: 'Transform this portrait into a synthetic AI humanoid with a sleek chrome design, glowing eyes, and a sterile lab.',
          variations: 1
        },
        {
          name: 'Oracle Stellaire',
          gender: 'g',
          style_key: 'star_oracle',
          description: 'Style oracle avec robes célestes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/star_oracle.jpg',
          prompt: 'Transform this portrait into a star priest or oracle with celestial robes and star maps floating in the air.',
          variations: 1
        },
        {
          name: 'Guerrier Clone',
          gender: 'g',
          style_key: 'clone_warrior',
          description: 'Style guerrier clone avec tatouage code-barres',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/clone_warrior.jpg',
          prompt: 'Transform this portrait into a clone warrior with a barcode tattoo, identical armor, and a desaturated war zone.',
          variations: 1
        },
        {
          name: 'Royauté Galactique',
          gender: 'g',
          style_key: 'galaxy_royalty',
          description: 'Style royauté avec regalia futuriste',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/galaxy_royalty.jpg',
          prompt: 'Transform this portrait into a galaxy royalty with futuristic regalia, glowing jewels, and a cosmic throne.',
          variations: 1
        },
        {
          name: 'Pilote Spatial',
          gender: 'g',
          style_key: 'space_pilot',
          description: 'Style pilote d\'exploration avec interface digitale',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/space_pilot.jpg',
          prompt: 'Transform this portrait into a pilot from a deep space exploration crew, with a visor and digital interface overlay.',
          variations: 1
        },
        {
          name: 'Mineur Martien',
          gender: 'g',
          style_key: 'martian_miner',
          description: 'Style mineur avec équipement poussiéreux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/martian_miner.jpg',
          prompt: 'Transform this portrait into a Martian miner with dusty gear, red-soil stains, and industrial space tools.',
          variations: 1
        },
        {
          name: 'Biotechnologue',
          gender: 'g',
          style_key: 'biotechnologist',
          description: 'Style biotechnologue d\'une colonie de terraformation',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/biotechnologist.jpg',
          prompt: 'Transform this portrait into a biotechnologist from a terraforming colony, holding strange alien plant life.',
          variations: 1
        },
        {
          name: 'Survivant de Stase',
          gender: 'g',
          style_key: 'stasis_survivor',
          description: 'Style survivant avec dommages de gel',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/stasis_survivor.jpg',
          prompt: 'Transform this portrait into a stasis survivor from a derelict ship, with frost damage and awakening lights.',
          variations: 1
        },
        {
          name: 'Hybride Alien',
          gender: 'g',
          style_key: 'alien_hybrid',
          description: 'Style hybride avec traits non-humains subtils',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/alien_hybrid.jpg',
          prompt: 'Transform this portrait into an alien hybrid with subtle non-human features, neon tattoos, and planetary rings behind.',
          variations: 1
        },
        {
          name: 'Explorateur de Trou Noir',
          gender: 'g',
          style_key: 'black_hole_explorer',
          description: 'Style explorateur avec combinaison fracturée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/black_hole_explorer.jpg',
          prompt: 'Transform this portrait into a black hole explorer with a fractured spacesuit, gravitic distortions, and eerie lighting.',
          variations: 1
        },
        {
          name: 'Amiral de Flotte',
          gender: 'g',
          style_key: 'fleet_admiral',
          description: 'Style amiral avec médailles ornées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fleet_admiral.jpg',
          prompt: 'Transform this portrait into a fleet admiral with ornate medals, holographic maps, and an interstellar command bridge.',
          variations: 1
        },
        {
          name: 'Voyageur Temporel',
          gender: 'g',
          style_key: 'time_traveler',
          description: 'Style voyageur avec vêtements rétro-futuristes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/time_traveler.jpg',
          prompt: 'Transform this portrait into a mysterious time-traveler with retro-futuristic clothes and a vortex behind.',
          variations: 1
        },
        {
          name: 'Leader de Rébellion Robot',
          gender: 'g',
          style_key: 'robot_rebellion_leader',
          description: 'Style robot avec plaque métallique rayée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/robot_rebellion_leader.jpg',
          prompt: 'Transform this portrait into a robot rebellion leader with scratched metal plating, glowing red eyes, and smoke-filled background.',
          variations: 1
        },
        {
          name: 'Mystique Spatial',
          gender: 'g',
          style_key: 'deep_space_mystic',
          description: 'Style mystique avec peau étoilée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/deep_space_mystic.jpg',
          prompt: 'Transform this portrait into a deep space mystic with starry skin, floating relics, and a cosmic temple.',
          variations: 1
        }
      ]
    },
    {
      id: 'cartoon',
      name: 'Collection Cartoon',
      description: 'Styles de dessins animés',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cartoon_style.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Cartoon 90s',
          gender: 'g',
          style_key: '90s_cartoon',
          description: 'Style de dessin animé des années 90',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/90s-cartoon.jpg',
          prompt: 'Make this a 90s cartoon character with bold outlines and vibrant colors',
          variations: 1
        },
        {
          name: 'Anime',
          gender: 'g',
          style_key: 'anime',
          description: 'Style anime japonais',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/anime.jpg',
          prompt: 'Transform this portrait into a Japanese anime character with large expressive eyes and stylized features',
          variations: 1
        },
        {
          name: 'Pixar',
          gender: 'g',
          style_key: 'pixar',
          description: 'Style 3D à la Pixar',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/pixar.jpg',
          prompt: 'Transform this portrait into a 3D Pixar-style character with expressive features and polished render',
          variations: 1
        },
        // New cartoon styles start here
        {
          name: 'Pixar 3D',
          gender: 'g',
          style_key: 'pixar_3d',
          description: 'Style Pixar avec textures lisses',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/pixar_3d.jpg',
          prompt: 'Transform this portrait into a Pixar-style 3D character with expressive eyes, smooth textures, and soft lighting.',
          variations: 1
        },
        {
          name: 'Disney Classique',
          gender: 'g',
          style_key: 'disney_classic',
          description: 'Style Disney animé classique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/disney_classic.jpg',
          prompt: 'Transform this portrait into a classic Disney animated character, with large eyes, clean lines, and a friendly smile.',
          variations: 1
        },
        {
          name: 'DreamWorks',
          gender: 'g',
          style_key: 'dreamworks',
          description: 'Style DreamWorks avec traits exagérés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/dreamworks.jpg',
          prompt: 'Transform this portrait into a stylized DreamWorks animation character, with exaggerated features and a bold personality.',
          variations: 1
        },
        {
          name: 'Cartoon Samedi Matin',
          gender: 'g',
          style_key: 'saturday_morning',
          description: 'Style cartoon des années 90',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/saturday_morning.jpg',
          prompt: 'Transform this portrait into a 90s Saturday morning cartoon style, with bright colors and simplified outlines.',
          variations: 1
        },
        {
          name: 'Looney Tunes',
          gender: 'g',
          style_key: 'looney_tunes',
          description: 'Style Looney Tunes vintage',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/looney_tunes.jpg',
          prompt: 'Transform this portrait into a vintage Looney Tunes character with expressive cartoon physics and retro charm.',
          variations: 1
        },
        {
          name: 'Anime Japonais',
          gender: 'g',
          style_key: 'japanese_anime',
          description: 'Style anime avec grands yeux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/japanese_anime.jpg',
          prompt: 'Transform this portrait into a Japanese anime character with big sparkling eyes, fine lines, and dynamic hair.',
          variations: 1
        },
        {
          name: 'Studio Ghibli',
          gender: 'g',
          style_key: 'studio_ghibli',
          description: 'Style Studio Ghibli avec arrière-plans aquarelle',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/studio_ghibli.jpg',
          prompt: 'Transform this portrait into a Studio Ghibli-style character with soft watercolor backgrounds and gentle expressions.',
          variations: 1
        },
        {
          name: 'Tim Burton',
          gender: 'g',
          style_key: 'tim_burton',
          description: 'Style Tim Burton avec traits gothiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/tim_burton.jpg',
          prompt: 'Transform this portrait into a Tim Burton-style cartoon character with gothic features and whimsical darkness.',
          variations: 1
        },
        {
          name: 'LEGO Minifigure',
          gender: 'g',
          style_key: 'lego_minifigure',
          description: 'Style LEGO avec formes blocky',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/lego_minifigure.jpg',
          prompt: 'Transform this portrait into a LEGO minifigure-style cartoon with blocky shapes and bright plastic textures.',
          variations: 1
        },
        {
          name: 'Les Simpsons',
          gender: 'g',
          style_key: 'simpsons',
          description: 'Style Simpsons avec peau jaune',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/simpsons.jpg',
          prompt: 'Transform this portrait into a Simpsons-style cartoon character with yellow skin and thick black outlines.',
          variations: 1
        },
    
        {
          name: 'South Park',
          gender: 'g',
          style_key: 'south_park',
          description: 'Style South Park avec traits plats 2D',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/south_park.jpg',
          prompt: 'Transform this portrait into a South Park-style cutout character with flat 2D features and simple geometry.',
          variations: 1
        },
        {
          name: 'Super-héros BD',
          gender: 'g',
          style_key: 'comic_book_superhero',
          description: 'Style super-héros de comics',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/comic_book_superhero.jpg',
          prompt: 'Transform this portrait into a comic book superhero style with bold inking, dynamic shadows, and vibrant highlights.',
          variations: 1
        },
        {
          name: 'Chibi',
          gender: 'g',
          style_key: 'chibi',
          description: 'Style Chibi avec tête surdimensionnée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/chibi.jpg',
          prompt: 'Transform this portrait into a Chibi-style character with tiny body, oversized head, and cute facial expressions.',
          variations: 1
        },
        {
          name: 'Cartoon Rétro 1930',
          gender: 'g',
          style_key: 'retro_1930s',
          description: 'Style cartoon rétro années 30',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/retro_1930s.jpg',
          prompt: 'Transform this portrait into a retro 1930s cartoon style, like early Mickey Mouse, with rubber hose limbs and grainy texture.',
          variations: 1
        },
        {
          name: 'Webtoon Moderne',
          gender: 'g',
          style_key: 'modern_webtoon',
          description: 'Style webtoon avec tons pastel',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/modern_webtoon.jpg',
          prompt: 'Transform this portrait into a modern webtoon-style illustration with pastel tones and clean digital brushwork.',
          variations: 1
        },
        {
          name: 'Personnage de Jeu Mobile',
          gender: 'g',
          style_key: 'mobile_game',
          description: 'Style personnage de jeu mobile 2D',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/mobile_game.jpg',
          prompt: 'Transform this portrait into a stylized 2D mobile game character, optimized for minimal lines and colorful impact.',
          variations: 1
        },
        {
          name: 'Caricature',
          gender: 'g',
          style_key: 'caricature',
          description: 'Style caricature avec traits exagérés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/caricature.jpg',
          prompt: 'Transform this portrait into a caricature-style cartoon with comically exaggerated facial features.',
          variations: 1
        },
        {
          name: 'Peanuts',
          gender: 'g',
          style_key: 'peanuts',
          description: 'Style Peanuts avec yeux en points',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/peanuts.jpg',
          prompt: 'Transform this portrait into a Peanuts-style character, with dot eyes, minimalist lines, and gentle charm.',
          variations: 1
        },
        {
          name: 'Gravity Falls',
          gender: 'g',
          style_key: 'gravity_falls',
          description: 'Style Gravity Falls avec proportions originales',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/gravity_falls.jpg',
          prompt: 'Transform this portrait into a "Gravity Falls" inspired cartoon, with quirky proportions and mysterious vibes.',
          variations: 1
        }
      ]
    },
    {
      id: 'digital',
      name: 'Collection Digital Art',
      description: 'Styles d\'art numérique et futuristes',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/digital_art.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Synthwave',
          gender: 'g',
          style_key: 'synthwave',
          description: 'Style synthwave avec néons et ambiance 80s',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/synthwave.jpg',
          prompt: 'Transform this portrait into a vibrant synthwave aesthetic with neon lights, grid landscapes, and 80s vibes.',
          variations: 1
        },
        {
          name: 'Retrowave',
          gender: 'g',
          style_key: 'retrowave',
          description: 'Style retrowave avec teintes violet-rose',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/retrowave.jpg',
          prompt: 'Transform this portrait into a retrowave style with purple-pink hues, glowing sunglasses, and vintage digital elements.',
          variations: 1
        },
        {
          name: 'Glitch Art',
          gender: 'g',
          style_key: 'glitch_art',
          description: 'Style glitch avec pixels distordus',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/glitch_art_digital.jpg',
          prompt: 'Transform this portrait into a glitch art style with distorted pixels, RGB color shifts, and digital noise.',
          variations: 1
        },
        {
          name: 'Cyberpunk',
          gender: 'g',
          style_key: 'cyberpunk',
          description: 'Style cyberpunk avec implants technologiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cyberpunk.jpg',
          prompt: 'Transform this portrait into a cyberpunk aesthetic with futuristic tech implants, neon signs, and a rainy cityscape.',
          variations: 1
        },
        {
          name: 'Low Poly',
          gender: 'g',
          style_key: 'low_poly',
          description: 'Rendu 3D low poly avec surfaces facettées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/low_poly.jpg',
          prompt: 'Transform this portrait into a low poly 3D render with faceted surfaces and abstract geometric shapes.',
          variations: 1
        },
        {
          name: 'Vaporwave',
          gender: 'g',
          style_key: 'vaporwave',
          description: 'Style vaporwave avec dégradés pastel',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vaporwave.jpg',
          prompt: 'Transform this portrait into a vaporwave aesthetic with pastel gradients, classical busts, and nostalgic internet motifs.',
          variations: 1
        },
        {
          name: 'Pixel Art',
          gender: 'g',
          style_key: 'pixel_art',
          description: 'Style pixel art avec ombrage 8-bit',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/pixel_art.jpg',
          prompt: 'Transform this portrait into a pixel art style with 8-bit shading, retro game elements, and limited color palette.',
          variations: 1
        },
        {
          name: 'Claymation',
          gender: 'g',
          style_key: 'claymation',
          description: 'Style claymation avec textures sculptées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/claymation.jpg',
          prompt: 'Transform this portrait into a claymation-style character with sculpted textures and stop-motion charm.',
          variations: 1
        },
        {
          name: 'Y2K',
          gender: 'g',
          style_key: 'y2k',
          description: 'Esthétique Y2K avec textures brillantes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/y2k.jpg',
          prompt: 'Transform this portrait into a Y2K aesthetic with glossy textures, metallic accessories, and futuristic fashion.',
          variations: 1
        },
        {
          name: 'Hyperpop',
          gender: 'g',
          style_key: 'hyperpop',
          description: 'Rendu 3D Hyperpop avec éclairage coloré',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/hyperpop.jpg',
          prompt: 'Transform this portrait into a high-gloss 3D render in hyperpop style with exaggerated features and colorful lighting.',
          variations: 1
        },
        {
          name: 'Holographique',
          gender: 'g',
          style_key: 'holographic',
          description: 'Avatar holographique avec reflets iridescents',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/holographic.jpg',
          prompt: 'Transform this portrait into a holographic digital avatar with translucent layers and iridescent reflections.',
          variations: 1
        },
        {
          name: 'Isométrique',
          gender: 'g',
          style_key: 'isometric',
          description: 'Art numérique isométrique avec environnements miniatures',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/isometric.jpg',
          prompt: 'Transform this portrait into an isometric digital art style with detailed miniature environments and angled perspectives.',
          variations: 1
        },
        {
          name: 'Art Génératif',
          gender: 'g',
          style_key: 'generative',
          description: 'Style inspiré de l\'art génératif avec formes algorithmiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/generative.jpg',
          prompt: 'Transform this portrait into a generative art-inspired style with algorithmic shapes, patterns, and abstract data flows.',
          variations: 1
        },
        {
          name: 'ASCII Art',
          gender: 'g',
          style_key: 'ascii',
          description: 'Style ASCII art avec caractères monochrome',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/ascii.jpg',
          prompt: 'Transform this portrait into an ASCII art style with monochrome characters forming the facial features.',
          variations: 1
        },
        {
          name: 'Cel-Shading',
          gender: 'g',
          style_key: 'cel_shading',
          description: 'Style 3D cel-shading avec contours marqués',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cel_shading.jpg',
          prompt: 'Transform this portrait into a cel-shaded 3D game style with bold outlines and anime-like shading.',
          variations: 1
        },
        {
          name: 'Influenceur Virtuel',
          gender: 'g',
          style_key: 'virtual_influencer',
          description: 'Avatar d\'influenceur virtuel photoréaliste',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/virtual_influencer.jpg',
          prompt: 'Transform this portrait into a photorealistic virtual influencer avatar with perfect skin and digital perfection.',
          variations: 1
        },
        {
          name: 'Motion Graphic',
          gender: 'g',
          style_key: 'motion_graphic',
          description: 'Image fixe de motion graphic avec dégradés fluides',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/motion_graphic.jpg',
          prompt: 'Transform this portrait into a motion graphic still frame with smooth gradients, floating shapes, and kinetic typography.',
          variations: 1
        },
        {
          name: 'NFT Art',
          gender: 'g',
          style_key: 'nft',
          description: 'Personnage de collection style NFT',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/nft.jpg',
          prompt: 'Transform this portrait into an NFT-style collectible character with exaggerated uniqueness and stylized traits.',
          variations: 1
        },
        {
          name: 'UI Minimal',
          gender: 'g',
          style_key: 'ui_minimal',
          description: 'Design inspiré UI avec couleurs plates',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/ui_minimal.jpg',
          prompt: 'Transform this portrait into a minimal UI-inspired design with flat colors, rounded elements, and clean geometry.',
          variations: 1
        },
        {
          name: 'Interface Sci-fi',
          gender: 'g',
          style_key: 'scifi_interface',
          description: 'Interface science-fiction générée par IA',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/scifi_interface.jpg',
          prompt: 'Transform this portrait into an AI-generated sci-fi interface with layered HUD elements and synthetic overlays.',
          variations: 1
        }
      ]
    },
    {
      id: 'vintage',
      name: 'Collection Vintage',
      description: 'Styles rétro des années 50-70',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vintage.jpg',
      compatibleWith: ['standard'],
      styles: [
        {
          name: 'Années 50',
          gender: 'f',
          style_key: 'vintage_50s',
          description: 'Look rétro féminin années 50',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/f-vintage50s.jpg',
          variations: 3
        },
        {
          name: 'Rockabilly',
          gender: 'm',
          style_key: 'rockabilly',
          description: 'Style rockabilly années 50',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/m-rockabilly.jpg',
          variations: 2
        },
        {
          name: 'Disco 70s',
          gender: 'f',
          style_key: 'disco',
          description: 'Style disco années 70',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/f-disco.jpg',
          variations: 4
        }
      ]
    },
    {
      id: 'western',
      name: 'Collection Western',
      description: 'Styles country et western',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/western.jpg',
      compatibleWith: ['standard'],
      styles: [
        {
          name: 'Cowboy',
          gender: 'm',
          style_key: 'cowboy',
          description: 'Style cowboy classique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/m-cowboy.jpg',
          variations: 3
        },
        {
          name: 'Cowgirl',
          gender: 'f',
          style_key: 'cowgirl',
          description: 'Style cowgirl',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/f-cowgirl.jpg',
          variations: 3
        }
      ]
    },
    {
      id: 'fantasy',
      name: 'Collection Fantaisie',
      description: 'Styles féeriques et fantastiques',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fantasy.jpg',
      compatibleWith: ['standard'],
      styles: [
        {
          name: 'Elfe',
          gender: 'f',
          style_key: 'elf',
          description: 'Style elfe féminin',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/f-elf.jpg',
          variations: 2
        },
        {
          name: 'Guerrier',
          gender: 'm',
          style_key: 'warrior',
          description: 'Style guerrier médiéval',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/m-warrior.jpg',
          variations: 3
        },
        {
          name: 'Sorcière',
          gender: 'f',
          style_key: 'witch',
          description: 'Style sorcière',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/f-witch.jpg',
          variations: 2
        }
      ]
    },
    {
      id: 'business',
      name: 'Collection Business',
      description: 'Styles professionnels',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/business.jpg',
      compatibleWith: ['standard'],
      styles: [
        {
          name: 'Homme d\'affaires',
          gender: 'm',
          style_key: 'businessman',
          description: 'Style homme d\'affaires moderne',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/m-business.jpg',
          variations: 2
        },
        {
          name: 'Femme d\'affaires',
          gender: 'f',
          style_key: 'businesswoman',
          description: 'Style femme d\'affaires moderne',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/f-business.jpg',
          variations: 2
        }
      ]
    },
    // Templates pour photobooth2 (MiniMax)
    {
      id: 'minimax-ghibli',
      name: 'Collection Portraits MiniMax',
      description: 'Prompts optimisés pour l\'IA MiniMax',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-ghibli.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Ghibli',
          gender: 'g',
          style_key: 'Ghibli',
          description: 'Style portrait studio Ghibli',
          prompt: 'add a Studio Ghibli-style illustration — soft watercolor palette, delicate linework, cozy atmosphere, and fantasy elements like floating lights or magical plants.'
        }
      
      ]
    },
    {
      id: 'minimax-pixar',
      name: 'Collection PIxar MiniMax',
      description: 'Personnages fantastiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-pixar.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
       
        {
          name: 'pixar',
          gender: 'g',
          style_key: 'cartoon',
          description: 'style 3d cartoon ',
          prompt: 'add a 3D Pixar-style cartoon clean lines, soft lighting, expressive features, and a polished render that feels cinematic.'
        }
      ]
    },
    {
      id: 'minimax-manga',
      name: 'Collection Manga',
      description: 'Portraits de Manga via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-manga.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'manga',
          gender: 'g',
          style_key: 'manga',
          description: 'Style japonais Manga',
          prompt: 'Stylize this image like an anime still bold linework, cel shading, speed lines in the background, and optional Japanese text or subtitle at the bottom'
        }
      ]
    },
    {
      id: 'minimax-empire',
      name: 'Collection Empire',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-empire.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style Empire',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'empire',
          description: 'Style empire',
          prompt: 'add Style by Style-Empire, (symmetry:1.1) (portrait of floral:1.05) pink and gold and opal color scheme, bold intricate filegrid facepaint, intricate, elegant, highly detailed, digital painting, artstation, concept art, smooth, sharp focus, illustration, art by greg rutkowski and alphonse mucha, 8k'
        }
      ]
    },
     {
      id: 'minimax-plastic',
      name: 'Collection plastique',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-plastic.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style plastic',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'plastique',
          description: 'Style plastique',
          prompt: 'cinematic film still wide shot, far full frame , Portrait Photographshifty crimson red skinned  muscular tiefling rogue with slick, coal-black hair and youthful, face with curled horns , center frame, standing proud with a big claymore sword in her hands , Hasselblad, looking at the camera, in a dark foreboding mossy fangorn forest , 4k, 8k, highly detailed, cinematic, 8k, magic lighting high detail, highly detailed, hyper realistic, intricate, intricate sharp details, 35mm photograph, film, bokeh, sunset, golden hour . shallow depth of field, vignette, highly detailed, high budget, bokeh, cinemascope, moody, epic, gorgeous, film grain, grainy'
        }
      ]
    },
    {
      id: 'minimax-caricature',
      name: 'Collection caricature',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-caricature.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style caricature',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'caricature',
          description: 'Style caricature',
          prompt: 'cinematic film still A powerful and imposing orc chieftain stands at the forefront of a dense, mystical forest, exuding an aura of strength and wisdom. The orc skin is a vibrant shade of green, with pronounced muscular features that reflect his warrior nature. He wears intricate armor adorned with sharp spikes and glowing green gemstones, signifying his status and power. Draped over his shoulders is a fur-lined cloak that blends seamlessly with the forest surroundings. In his hand, he holds a staff topped with a glowing, green crystal, which emits a soft, eerie light. The staff is intricately carved with ancient symbols, adding to its mystical appearance. Behind him, a group of armored warriors, dressed in earth-toned robes and metal armor, stand ready, showing loyalty and readiness for battle. The forest is bathed in a soft, greenish light filtering through the dense canopy, with tall trees enveloping the scene, creating an atmosphere of mystery and ancient power . shallow depth of field, vignette, highly detailed, high budget, bokeh, cinemascope, moody, epic, gorgeous, film grain, grainy'
        }
      ]
    },
        {
      id: 'minimax-impressionniste',
      name: 'Collection impressionniste',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-impressionnniste.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style impressionniste',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'impressionniste',
          description: 'Style impressionniste',
          prompt: 'Impressionist painting Impressionist painting Claude Monet painting Antibes sea view with tree. . Loose brushwork, vibrant color, light and shadow play, captures feeling over form . Loose brushwork, vibrant color, light and shadow play, captures feeling over form,8k, ultra realist'
        }
      ]
    },
            {
      id: 'minimax-painting',
      name: 'Collection painting',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-painting.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style painting',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'painting',
          description: 'Style painting',
          prompt: 'Impressionist painting Picasso painting . . Loose brushwork, vibrant color, light and shadow play, captures feeling over form, 8k, ultra realist photography'
        }
      ]
    },
                {
      id: 'minimax-clay',
      name: 'Collection clay',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-clay.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style clay',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'clay',
          description: 'Style clay',
          prompt: 'clay style,  8k, ultra realist photography'
        }
      ]
    },
    {  // Correction: ajout de l'accolade ouvrante et de la virgule
      id: 'minimax-milo',
      name: 'Collection milo',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-milo.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style milo',
          gender: 'g',
          style_key: 'milo',
          description: 'Style milo',
          prompt: 'Group people in a bar outdoor ,with smartphone in own hands,clear night ,hot weather,by Milo Manara side angle, medium shot, upper body, long shot technique , artstation, 8k, ultra realistic'
        }
      ]
    },
                    {
      id: 'minimax-drawing',
      name: 'Collection drawing',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-drawing.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style drawing',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'drawing',
          description: 'Style drawing',
          prompt: 'The Simpsons style, it is important that people have yellow skin , big head, artstation, 8k, ultra realistic , Simpsons Style'
        }
      ]
    },
        {
      id: 'minimax-kitchen',
      name: 'Collection kitchen',
      description: 'Styles artistiques via prompts',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-kitchen.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Style kitchen',
          gender: 'g',  // Fixed missing closing quote
          style_key: 'kitchen',
          description: 'Style kitchen',
          prompt: 'add Style-Kitchen, japanese restaurant, sushi, onigiri, digital painting, concept art, smooth, ((sharp focus)), rule of thirds, ntricate details, wide shot,  cooking, highly detailed, digital painting, artstation, concept art, smooth, sharp focus, illustration, art by greg rutkowski and alphonse mucha, 8k'
        }
      ]
    },
    {
      id: 'minimax-psycho',
      name: 'Collection Groupes psycho',
      description: 'Styles pour des photos de groupe',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/minimax-psycho.jpeg',
      compatibleWith: ['photobooth2'],
      styles: [
        {
          name: 'Groupe Famille',
          gender: 'g',
          style_key: 'family',
          description: 'Portrait de famille',
          prompt: '[style-Psycho::30] award winning photo of a cat in a wet city street, dark, menacing, grim, neon lamps, moon, night'
        }
      ]
    },
    // Add new avatar templates
    {
      id: 'avatar-fashion',
      name: 'Collection Avatar Fashion',
      description: 'Styles fashion pour avatar IA',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/avatar-fashion.jpg',
      compatibleWith: ['avatar'],
      styles: [
        {
          name: 'Met Gala',
          gender: 'g',
          style_key: 'metgala',
          description: 'Style élégant de tapis rouge',
          prompt: "at the Met Gala, dressed in very fancy outfits, captured in a full body shot"
        },
        {
          name: 'Business',
          gender: 'g',
          style_key: 'business',
          description: 'Style professionnel',
          prompt: "professional business attire, in an office setting, full body shot"
        },
        {
          name: 'Casual',
          gender: 'g',
          style_key: 'casual',
          description: 'Style décontracté',
          prompt: "casual streetwear outfit, urban environment, full body shot"
        }
      ]
    },
    {
      id: 'avatar-fantasy',
      name: 'Collection Avatar Fantasy',
      description: 'Avatars de fantaisie',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/avatar-fantasy.jpg',
      compatibleWith: ['avatar'],
      styles: [
        {
          name: 'Médiéval',
          gender: 'g',
          style_key: 'medieval',
          description: 'Style médiéval fantasy',
          prompt: "as a medieval knight in shining armor, fantasy setting, full body shot"
        },
        {
          name: 'Super Hero',
          gender: 'g',
          style_key: 'superhero',
          description: 'Style super héros',
          prompt: "as a superhero with a cape, action pose, city background, full body shot"
        },
        {
          name: 'Space',
          gender: 'g',
          style_key: 'space',
          description: 'Style spatial futuriste',
          prompt: "as an astronaut in a futuristic space suit, on mars, full body shot"
        }
      ]
    },
    {
      id: 'avatar-professional',
      name: 'Collection Avatar Pro',
      description: 'Avatars professionnels',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/avatar-professional.jpg',
      compatibleWith: ['avatar'],
      styles: [
        {
          name: 'LinkedIn',
          gender: 'g',
          style_key: 'linkedin',
          description: 'Portrait professionnel style LinkedIn',
          prompt: "professional headshot for LinkedIn, neutral background, shoulders up"
        },
        {
          name: 'CEO',
          gender: 'g',
          style_key: 'ceo',
          description: 'Style executive',
          prompt: "as a CEO in a corner office, wearing a suit, professional setting, upper body shot"
        },
        {
          name: 'Creative',
          gender: 'g',
          style_key: 'creative',
          description: 'Style créatif pour portfolio',
          prompt: "creative professional in a design studio, artistic environment, half body shot"
        }
      ]
    },
    {
      id: 'medieval',
      name: 'Collection Médiévale Fantastique',
      description: 'Styles inspirés des univers médiévaux fantastiques',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/medieval_fantasy.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Guerrier Elfe',
          gender: 'g',
          style_key: 'elven_warrior',
          description: 'Style guerrier elfe avec armure argentée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/elven_warrior.jpg',
          prompt: 'Transform this portrait into an elven warrior with silver armor, glowing blue eyes, and a mystical forest background.',
          variations: 1
        },
        {
          name: 'Chevalier',
          gender: 'g',
          style_key: 'battle_knight',
          description: 'Style chevalier en armure brillante',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/battle_knight.jpg',
          prompt: 'Transform this portrait into a battle-worn knight in shining armor, with a sword over the shoulder and stormy skies behind.',
          variations: 1
        },
        {
          name: 'Sorcier Elfe',
          gender: 'g',
          style_key: 'high_elf_sorcerer',
          description: 'Style sorcier elfe royal avec robes complexes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/high_elf_sorcerer.jpg',
          prompt: 'Transform this portrait into a royal high elf sorcerer with intricate robes, ancient runes, and a magical staff.',
          variations: 1
        },
        {
          name: 'Assassin Elfe Noir',
          gender: 'g',
          style_key: 'dark_elf_assassin',
          description: 'Style assassin elfe noir avec cape à capuche',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/dark_elf_assassin.jpg',
          prompt: 'Transform this portrait into a dark elf assassin with a hooded cloak, dual daggers, and shadowy surroundings.',
          variations: 1
        },
        {
          name: 'Forgeron Nain',
          gender: 'g',
          style_key: 'dwarven_blacksmith',
          description: 'Style forgeron nain avec barbe tressée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/dwarven_blacksmith.jpg',
          prompt: 'Transform this portrait into a dwarven blacksmith with a braided beard, hammer in hand, and a forge in the background.',
          variations: 1
        },
        {
          name: 'Druide',
          gender: 'g',
          style_key: 'forest_druid',
          description: 'Style druide de forêt enchantée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/forest_druid.jpg',
          prompt: 'Transform this portrait into a druid from an enchanted forest, with animal companions and glowing plants around.',
          variations: 1
        },
        {
          name: 'Chevaucheur de Dragon',
          gender: 'g',
          style_key: 'dragon_rider',
          description: 'Style chevaucheur de dragon avec harnais en cuir',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/dragon_rider.jpg',
          prompt: 'Transform this portrait into a dragon rider with a leather harness, wind-blown hair, and a fire-breathing dragon behind.',
          variations: 1
        },
        {
          name: 'Chevalier Mort-Vivant',
          gender: 'g',
          style_key: 'undead_knight',
          description: 'Style chevalier mort-vivant maudit',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/undead_knight.jpg',
          prompt: 'Transform this portrait into a cursed undead knight with glowing red eyes, cracked armor, and a haunted battlefield.',
          variations: 1
        },
        {
          name: 'Reine Médiévale',
          gender: 'g',
          style_key: 'medieval_queen',
          description: 'Style reine médiévale avec couronne ornée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/medieval_queen.jpg',
          prompt: 'Transform this portrait into a medieval queen with a jeweled crown, rich fabrics, and candlelit stone halls.',
          variations: 1
        },
        {
          name: 'Barde de Taverne',
          gender: 'g',
          style_key: 'tavern_bard',
          description: 'Style barde de taverne avec luth',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/tavern_bard.jpg',
          prompt: 'Transform this portrait into a tavern bard with a lute, mischievous smile, and rustic fantasy inn ambiance.',
          variations: 1
        },
        {
          name: 'Nymphe des Bois',
          gender: 'g',
          style_key: 'woodland_nymph',
          description: 'Style nymphe des bois avec accessoires floraux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/woodland_nymph.jpg',
          prompt: 'Transform this portrait into a woodland nymph with floral accessories, glowing skin, and soft magical sparkles.',
          variations: 1
        },
        {
          name: 'Guerrier Orc',
          gender: 'g',
          style_key: 'orc_warrior',
          description: 'Style guerrier orc avec défenses',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/orc_warrior.jpg',
          prompt: 'Transform this portrait into an orc warrior with tusks, heavy armor, and a war-torn battlefield in the background.',
          variations: 1
        },
        {
          name: 'Mage du Phénix',
          gender: 'g',
          style_key: 'phoenix_mage',
          description: 'Style mage du phénix avec feu dans les yeux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/phoenix_mage.jpg',
          prompt: 'Transform this portrait into a phoenix mage with fire in their eyes, burning feathers, and embers swirling around.',
          variations: 1
        },
        {
          name: 'Oracle',
          gender: 'g',
          style_key: 'seer_oracle',
          description: 'Style voyant ou oracle avec yeux bandés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/seer_oracle.jpg',
          prompt: 'Transform this portrait into a seer or oracle, with blindfolded eyes, floating runes, and glowing crystal spheres.',
          variations: 1
        },
        {
          name: 'Noble Vampire',
          gender: 'g',
          style_key: 'vampire_noble',
          description: 'Style noble vampire d\'un royaume gothique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vampire_noble.jpg',
          prompt: 'Transform this portrait into a vampire noble from a gothic fantasy realm, with pale skin, red eyes, and a blood-red cloak.',
          variations: 1
        },
        {
          name: 'Paladin',
          gender: 'g',
          style_key: 'holy_paladin',
          description: 'Style paladin avec armure sacrée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/holy_paladin.jpg',
          prompt: 'Transform this portrait into a paladin with holy armor, radiant light effects, and a divine sigil on the chest.',
          variations: 1
        },
        {
          name: 'Alchimiste Gobelin',
          gender: 'g',
          style_key: 'goblin_alchemist',
          description: 'Style alchimiste gobelin avec lunettes farfelues',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/goblin_alchemist.jpg',
          prompt: 'Transform this portrait into a goblin alchemist with wild goggles, potions in hand, and a cluttered workshop.',
          variations: 1
        },
        {
          name: 'Mage de Glace',
          gender: 'g',
          style_key: 'frost_mage',
          description: 'Style mage de glace d\'un royaume nordique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/frost_mage.jpg',
          prompt: 'Transform this portrait into a frost mage from a northern kingdom, with icy breath and a blizzard backdrop.',
          variations: 1
        },
        {
          name: 'Ange Déchu',
          gender: 'g',
          style_key: 'fallen_angel',
          description: 'Style ange déchu avec ailes sombres',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fallen_angel.jpg',
          prompt: 'Transform this portrait into a fallen angel with dark wings, glowing scars, and a broken halo.',
          variations: 1
        },
        {
          name: 'Héros Mythique',
          gender: 'g',
          style_key: 'mythic_hero',
          description: 'Style héros mythique d\'une prophétie ancienne',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/mythic_hero.jpg',
          prompt: 'Transform this portrait into a mythic hero from an ancient prophecy, with golden armor and celestial markings.',
          variations: 1
        }
      ]
    },
    // Add the new Post-apocalyptic collection here
    {
      id: 'post-apocalyptic',
      name: 'Collection Post-Apocalyptique',
      description: 'Styles inspirés de l\'univers post-apocalyptique',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/post_apocalyptic.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Charognard des Terres Désolées',
          gender: 'g',
          style_key: 'wasteland_scavenger',
          description: 'Style charognard avec armure usée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/wasteland_scavenger.jpg',
          prompt: 'Transform this portrait into a wasteland scavenger with worn-out armor, dust-covered face, and a ruined city behind.',
          variations: 1
        },
        {
          name: 'Survivant au Masque à Gaz',
          gender: 'g',
          style_key: 'gas_mask_survivor',
          description: 'Style survivant avec masque à gaz',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/gas_mask_survivor.jpg',
          prompt: 'Transform this portrait into a survivor wearing a gas mask, with cracked goggles and radioactive fog in the background.',
          variations: 1
        },
        {
          name: 'Nomade du Désert',
          gender: 'g',
          style_key: 'desert_nomad',
          description: 'Style nomade avec équipement improvisé',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/desert_nomad.jpg',
          prompt: 'Transform this portrait into a desert nomad with improvised gear, sun-scorched skin, and a rusted vehicle nearby.',
          variations: 1
        },
        {
          name: 'Guerrier Mutant',
          gender: 'g',
          style_key: 'mutated_warrior',
          description: 'Style guerrier avec cicatrices luminescentes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/mutated_warrior.jpg',
          prompt: 'Transform this portrait into a mutated warrior with glowing scars, bio-enhancements, and a toxic landscape.',
          variations: 1
        },
        {
          name: 'Combattant de la Résistance',
          gender: 'g',
          style_key: 'resistance_fighter',
          description: 'Style combattant avec blessures bandées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/resistance_fighter.jpg',
          prompt: 'Transform this portrait into a resistance fighter with bandaged wounds, improvised weapons, and a ruined overpass.',
          variations: 1
        },
        {
          name: 'Vagabond Solitaire',
          gender: 'g',
          style_key: 'lone_wanderer',
          description: 'Style vagabond avec manteau long',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/lone_wanderer.jpg',
          prompt: 'Transform this portrait into a lone wanderer with a trench coat, survival backpack, and a decaying billboard behind.',
          variations: 1
        },
        {
          name: 'Habitant de Bunker',
          gender: 'g',
          style_key: 'bunker_dweller',
          description: 'Style habitant avec peau pâle',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/bunker_dweller.jpg',
          prompt: 'Transform this portrait into a bunker dweller with pale skin, outdated tech, and dim emergency lights.'
        },
        {
          name: 'Survivant de Peste',
          gender: 'g',
          style_key: 'plague_survivor',
          description: 'Style survivant avec cape en lambeaux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/plague_survivor.jpg',
          prompt: 'Transform this portrait into a plague survivor with a tattered cloak, worn gloves, and a crumbling hospital in the distance.',
          variations: 1
        },
        {
          name: 'Chef de Culte Post-Nucléaire',
          gender: 'g',
          style_key: 'post_nuclear_cult_leader',
          description: 'Style chef de culte avec relique lumineuse',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/post_nuclear_cult_leader.jpg',
          prompt: 'Transform this portrait into a post-nuclear cult leader with a glowing relic, ritual tattoos, and fanatics behind them.',
          variations: 1
        },
        {
          name: 'Soldat des Retombées',
          gender: 'g',
          style_key: 'fallout_soldier',
          description: 'Style soldat avec armure assistée improvisée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fallout_soldier.jpg',
          prompt: 'Transform this portrait into a fallout soldier in makeshift power armor, walking through an irradiated zone.',
          variations: 1
        },
        {
          name: 'Cyber-Charognard',
          gender: 'g',
          style_key: 'cyber_scavenger',
          description: 'Style charognard avec implants dépareillés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cyber_scavenger.jpg',
          prompt: 'Transform this portrait into a cyber-scavenger with mismatched implants and salvaged data cores on their belt.',
          variations: 1
        },
        {
          name: 'Chasseur de Ruines',
          gender: 'g',
          style_key: 'ruin_hunter',
          description: 'Style explorateur de gratte-ciels anciens',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/ruin_hunter.jpg',
          prompt: 'Transform this portrait into a ruin-hunter exploring ancient skyscrapers overgrown with nature.',
          variations: 1
        },
        {
          name: 'Survivant Sauvage',
          gender: 'g',
          style_key: 'feral_survivor',
          description: 'Style survivant avec peinture de guerre',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/feral_survivor.jpg',
          prompt: 'Transform this portrait into a feral survivor with dirty face paint, animal bones, and survival trophies.',
          variations: 1
        },
        {
          name: 'Opérateur Radio Rebelle',
          gender: 'g',
          style_key: 'rebel_radio_operator',
          description: 'Style opérateur avec casque et cadrans',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/rebel_radio_operator.jpg',
          prompt: 'Transform this portrait into a rebel radio operator with headphones, frequency dials, and a hidden transmission tower.',
          variations: 1
        },
        {
          name: 'Androïde IA',
          gender: 'g',
          style_key: 'rogue_ai_android',
          description: 'Style androïde avec armure fissurée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/rogue_ai_android.jpg',
          prompt: 'Transform this portrait into a rogue AI-controlled android with cracked armor and malfunctioning sensors.',
          variations: 1
        },
        {
          name: 'Fantôme de l\'Apocalypse',
          gender: 'g',
          style_key: 'apocalypse_ghost',
          description: 'Style fantôme avec vêtements décolorés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/apocalypse_ghost.jpg',
          prompt: 'Transform this portrait into a ghost of the apocalypse, with faded clothing, glowing eyes, and ash swirling around.',
          variations: 1
        },
        {
          name: 'Enfant Mutant',
          gender: 'g',
          style_key: 'mutant_child',
          description: 'Style enfant avec lunettes surdimensionnées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/mutant_child.jpg',
          prompt: 'Transform this portrait into a mutant child with oversized goggles, fragile tech gear, and a hopeful look.',
          variations: 1
        },
        {
          name: 'Reine des Charognards',
          gender: 'g',
          style_key: 'scavenger_queen',
          description: 'Style reine avec couronne de fils',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/scavenger_queen.jpg',
          prompt: 'Transform this portrait into a scavenger queen with a crown of wires, armor made from relics, and a desert throne.',
          variations: 1
        },
        {
          name: 'Vétéran Cicatrisé',
          gender: 'g',
          style_key: 'battle_scarred_veteran',
          description: 'Style vétéran avec membres cybernétiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/battle_scarred_veteran.jpg',
          prompt: 'Transform this portrait into a battle-scarred veteran with cybernetic limbs, bloodstained gear, and haunted eyes.',
          variations: 1
        },
        {
          name: 'Survivant Porteur d\'Espoir',
          gender: 'g',
          style_key: 'hopeful_survivor',
          description: 'Style survivant plantant une graine',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/hopeful_survivor.jpg',
          prompt: 'Transform this portrait into a hopeful survivor planting a seed in the wasteland, with green sprouting in the ash.',
          variations: 1
        }
      ]
    },
    {
      id: 'photographic',
      name: 'Collection Photographie',
      description: 'Styles photographiques de diverses époques et techniques',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/photographic.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Film Vintage 1960s',
          gender: 'g',
          style_key: 'vintage_film_60s',
          description: 'Style film vintage années 60 avec tons chauds',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vintage_film_60s.jpg',
          prompt: 'Transform this portrait into a vintage film photo from the 1960s, with warm tones, grainy texture, and soft focus.',
          variations: 1
        },
        {
          name: 'Couverture de Magazine',
          gender: 'g',
          style_key: 'fashion_magazine',
          description: 'Style couverture de magazine Vogue avec éclairage dramatique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fashion_magazine.jpg',
          prompt: 'fashion_magazine',
          variations: 1
        },
        {
          name: 'Photo de Rue Noir et Blanc',
          gender: 'g',
          style_key: 'bw_street_photo',
          description: 'Style Leica noir et blanc avec texture urbaine',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/bw_street_photo.jpg',
          prompt: 'bw_street_photo',
          variations: 1
        },
        {
          name: 'Polaroid 1980s',
          gender: 'g',
          style_key: 'polaroid_80s',
          description: 'Style Polaroid années 80 avec couleurs délavées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/polaroid_80s.jpg',
          prompt: 'Make this into polaroid_80s.',
          variations: 1
        },
        {
          name: 'Documentaire Salgado',
          gender: 'g',
          style_key: 'salgado_documentary',
          description: 'Style documentaire Sebastião Salgado en noir et blanc',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/salgado_documentary.jpg',
          prompt: 'Make this in black and white, with powerful emotion and texture.',
          variations: 1
        },
        {
          name: 'Studio High-Key',
          gender: 'g',
          style_key: 'high_key_studio',
          description: 'Style studio high-key avec fond blanc lumineux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/high_key_studio.jpg',
          prompt: 'Make this  into a high-key studio photo with bright white background, even lighting, and soft shadows.',
          variations: 1
        },
        {
          name: 'Portrait Low-Key',
          gender: 'g',
          style_key: 'low_key_portrait',
          description: 'Style low-key avec ombres dramatiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/low_key_portrait.jpg',
          prompt: 'Make this into a low-key with dramatic dark shadows, focused highlights, and intense mood.',
          variations: 1
        },
        {
          name: 'Plan Cinématographique',
          gender: 'g',
          style_key: 'cinematic_frame',
          description: 'Style cinématographique avec étalonnage bleu-orange',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cinematic_frame.jpg',
          prompt: 'Make this into a cinematic still frame with teal-orange color grading, shallow depth of field, and moody lighting.',
          variations: 1
        },
        {
          name: 'Paparazzi 2000s',
          gender: 'g',
          style_key: 'paparazzi_2000s',
          description: 'Style paparazzi des années 2000 avec flash puissant',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/paparazzi_2000s.jpg',
          prompt: 'Make this into an early 2000s paparazzi shot, slightly blurred, with harsh flash and off-guard expression.',
          variations: 1
        },
        {
          name: 'Instagram 2020s',
          gender: 'g',
          style_key: 'instagram_2020s',
          description: 'Style Instagram avec filtres doux et tons pastel',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/instagram_2020s.jpg',
          prompt: 'Make this into a stylized Instagram photo from the 2020s with soft filters, pastel tones, and lifestyle accessories.',
          variations: 1
        },
        {
          name: 'Webcam VHS',
          gender: 'g',
          style_key: 'vhs_webcam',
          description: 'Style webcam VHS avec aberrations chromatiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vhs_webcam.jpg',
          prompt: 'Make this into a VHS webcam image with glitch lines, chromatic aberration, and retro screen artifacts.',
          variations: 1
        },
        {
          name: 'Film Noir',
          gender: 'g',
          style_key: 'film_noir',
          description: 'Style film noir avec contraste fort et ombres mystérieuses',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/film_noir.jpg',
          prompt: 'Make this into a classic film noir with strong contrast, shadows on the face, and a mysterious mood.',
          variations: 1
        },
        {
          name: 'Appareil Jetable',
          gender: 'g',
          style_key: 'disposable_camera',
          description: 'Style appareil photo jetable avec mise au point imparfaite',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/disposable_camera.jpg',
          prompt: 'Make this into a candid photo taken on a disposable camera, with imperfect focus and real-life atmosphere.',
          variations: 1
        },
        {
          name: 'Photomaton',
          gender: 'g',
          style_key: 'passport_booth',
          description: 'Style photomaton pour documents officiels',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/passport_booth.jpg',
          prompt: 'Make this into a passport photo booth image with flat lighting, expressionless pose, and official framing.',
          variations: 1
        },
        {
          name: 'Mode Urbaine',
          gender: 'g',
          style_key: 'street_fashion',
          description: 'Style mode urbaine avec éclairage naturel',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/street_fashion.jpg',
          prompt: 'Make this into a street fashion photo with natural lighting, a trendy outfit, and an urban backdrop.',
          variations: 1
        },
        {
          name: 'National Geographic',
          gender: 'g',
          style_key: 'national_geographic',
          description: 'Style National Geographic avec contexte culturel riche',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/national_geographic.jpg',
          prompt: 'Make this into a National Geographic-style photo with rich cultural context and realistic lighting.',
          variations: 1
        },
        {
          name: 'Objectif Fisheye',
          gender: 'g',
          style_key: 'fisheye_lens',
          description: 'Style objectif fisheye avec proportions exagérées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fisheye_lens.jpg',
          prompt: 'Make this into a photo taken with a fisheye lens, exaggerating facial proportions and giving a playful vibe.',
          variations: 1
        },
        {
          name: 'Tapis Rouge',
          gender: 'g',
          style_key: 'red_carpet',
          description: 'Style célébrité sur tapis rouge avec flashes des paparazzi',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/red_carpet.jpg',
          prompt: 'Make this into a red carpet celebrity shot with glamorous lighting, lens flares, and paparazzi flashes.',
          variations: 1
        },
        {
          name: 'Studio Sears 90s',
          gender: 'g',
          style_key: 'sears_studio_90s',
          description: 'Style portrait studio Sears des années 90',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/sears_studio_90s.jpg',
          prompt: 'Make this into a retro 90s Sears studio with cheesy background gradients and soft spot lighting.',
          variations: 1
        },
        {
          name: 'Photojournalisme',
          gender: 'g',
          style_key: 'photojournalism',
          description: 'Style photojournalisme en noir et blanc',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/photojournalism.jpg',
          prompt: 'Make this into  a candid black-and-white photojournalism image with authentic emotion and ambient light.',
          variations: 1
        }
      ]
    },
    {
      id: 'culturel',
      name: 'Collection Culturelle',
      description: 'Styles artistiques de diverses cultures du monde',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/culturel.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Ukiyo-e Japonais',
          gender: 'g',
          style_key: 'japanese_ukiyo_e',
          description: 'Style d\'estampe japonaise traditionnelle avec lignes fluides',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/japanese_ukiyo_e.jpg',
          prompt: 'Make this into a traditional Japanese ukiyo-e woodblock print with flowing lines, flat colors, and stylized waves.',
          variations: 1
        },
        {
          name: 'Miniature Persane',
          gender: 'g',
          style_key: 'persian_miniature',
          description: 'Style de peinture persane avec motifs complexes et accents dorés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/persian_miniature.jpg',
          prompt: 'Make this into a Persian miniature painting with intricate patterns, gold accents, and delicate storytelling scenes.',
          variations: 1
        },
        {
          name: 'Masque Africain',
          gender: 'g',
          style_key: 'african_mask',
          description: 'Style de masque africain avec formes audacieuses et géométrie tribale',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/african_mask.jpg',
          prompt: 'Make this into a stylized African composition with bold shapes, tribal geometry, and earthy textures.',
          variations: 1
        },
        {
          name: 'Día de los Muertos',
          gender: 'g',
          style_key: 'dia_de_los_muertos',
          description: 'Style mexicain du Jour des Morts avec motifs colorés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/dia_de_los_muertos.jpg',
          prompt: 'Make this into a vibrant Día de los Muertos artwork with sugar skull motifs, marigold flowers, and festive symbolism.',
          variations: 1
        },
        {
          name: 'Icône Byzantine',
          gender: 'g',
          style_key: 'byzantine_icon',
          description: 'Style d\'icône religieuse avec fond doré et symbolisme sacré',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/byzantine_icon.jpg',
          prompt: 'Make this into a Byzantine icon with gold leaf background, solemn expressions, and religious symbolism in flat perspective.',
          variations: 1
        },
        {
          name: 'Bollywood',
          gender: 'g',
          style_key: 'bollywood_style',
          description: 'Style indien de Bollywood avec costumes éblouissants et ambiance festive',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/bollywood_style.jpg',
          prompt: 'Make this into a colorful Bollywood-style scene with dazzling costumes, ornate jewelry, and a festive dance atmosphere.',
          variations: 1
        },
        {
          name: 'Art Viking',
          gender: 'g',
          style_key: 'viking_art',
          description: 'Style inspiré des Vikings avec motifs runiques et textures boisées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/viking_art.jpg',
          prompt: 'Make this into a Viking-inspired artwork with runic patterns, carved wood textures, and mythological Norse elements.',
          variations: 1
        },
        {
          name: 'Textile Navajo',
          gender: 'g',
          style_key: 'navajo_textile',
          description: 'Style textile Navajo avec motifs géométriques et tons désertiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/navajo_textile.jpg',
          prompt: 'Make this into a textile-based Navajo or Hopi-style visual with geometric patterns, natural dyes, and desert tones.',
          variations: 1
        },
        {
          name: 'Art Balinais',
          gender: 'g',
          style_key: 'balinese_art',
          description: 'Style artistique balinais avec ornementation riche et symboles sacrés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/balinese_art.jpg',
          prompt: 'Make this into a traditional Balinese artistic scene with rich ornamentation, expressive gestures, and sacred symbols.',
          variations: 1
        },
        {
          name: 'Art Inuit',
          gender: 'g',
          style_key: 'inuit_art',
          description: 'Style d\'art inuit avec formes simplifiées et faune arctique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/inuit_art.jpg',
          prompt: 'Make this into an Inuit-style artwork using bold simplified shapes, natural colors, and references to Arctic wildlife.',
          variations: 1
        },
        {
          name: 'Fresque Khmère',
          gender: 'g',
          style_key: 'khmer_mural',
          description: 'Style de fresque de temple Khmer avec dieux anciens et gravures complexes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/khmer_mural.jpg',
          prompt: 'Make this into a Khmer temple mural with ancient gods, intricate carvings, and golden halos.',
          variations: 1
        },
        {
          name: 'Art Māori',
          gender: 'g',
          style_key: 'maori_art',
          description: 'Style māori avec spirales koru et motifs de tatouage facial',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/maori_art.jpg',
          prompt: 'Make this into a Māori art style with koru spirals, facial tattoo patterns, and symbolic storytelling.',
          variations: 1
        },
        {
          name: 'Folklore Russe',
          gender: 'g',
          style_key: 'russian_folk',
          description: 'Style d\'art populaire russe avec bordures florales et charme villageois',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/russian_folk.jpg',
          prompt: 'Make this into a Russian folk art scene with floral borders, nested doll symmetry, and winter village charm.',
          variations: 1
        },
        {
          name: 'Peinture Aborigène',
          gender: 'g',
          style_key: 'aboriginal_dot',
          description: 'Style de peinture pointilliste aborigène avec symbolisme superposé',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/aboriginal_dot.jpg',
          prompt: 'Make this into an Aboriginal dot painting with layered symbolism, vibrant color palettes, and concentric patterns.'
        },
        {
          name: 'Encre Chinoise',
          gender: 'g',
          style_key: 'chinese_ink',
          description: 'Style de peinture à l\'encre chinoise avec coups de pinceau minimalistes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/chinese_ink.jpg',
          prompt: 'Make this into a Chinese ink painting with minimalist brush strokes, misty landscapes, and traditional seals.',
          variations: 1
        },
        {
          name: 'Fresque Hellénistique',
          gender: 'g',
          style_key: 'hellenistic_fresco',
          description: 'Style de fresque hellénistique avec figures mythologiques et symétrie classique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/hellenistic_fresco.jpg',
          prompt: 'Make this into a Hellenistic fresco with mythological figures, pastel hues, and classical symmetry.',
          variations: 1
        },
        {
          name: 'Afro-futurisme',
          gender: 'g',
          style_key: 'afrofuturism',
          description: 'Style afro-futuriste avec motifs traditionnels réimaginés en éléments néon',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/afrofuturism.jpg',
          prompt: 'Make this into a contemporary Afro-futurist vision with traditional motifs reimagined in metallic and neon elements.',
          variations: 1
        },
        {
          name: 'Thangka Tibétain',
          gender: 'g',
          style_key: 'tibetan_thangka',
          description: 'Style de peinture thangka tibétaine avec iconographie complexe',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/tibetan_thangka.jpg',
          prompt: 'Make this into a Tibetan thangka painting with layered iconography, detailed mandalas, and vivid spiritual colors.',
          variations: 1
        },
        {
          name: 'Mythologie Alaskaine',
          gender: 'g',
          style_key: 'alaskan_myth',
          description: 'Style mythologique des natifs d\'Alaska avec esprits animaux',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/alaskan_myth.jpg',
          prompt: 'Make this into a Native Alaskan mythological scene with animal spirits, stylized totems, and ice-blue palettes.',
          variations: 1
        },
        {
          name: 'Minhwa Coréen',
          gender: 'g',
          style_key: 'korean_minhwa',
          description: 'Style de peinture minhwa coréenne avec tigres stylisés et symboles porte-bonheur',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/korean_minhwa.jpg',
          prompt: 'Make this into a traditional Korean minhwa painting with stylized tigers, lucky symbols, and folkloric vibrancy.',
          variations: 1
        }
      ]
    },
    {
      id: 'sport',
      name: 'Collection Sport',
      description: 'Styles inspirés du monde du sport et de l\'activité physique',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/sport.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Anime Sportif',
          gender: 'g',
          style_key: 'sports_anime',
          description: 'Style anime dynamique avec lignes de vitesse',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/sports_anime.jpg',
          prompt: 'Make this into a dynamic sports anime scene with speed lines, exaggerated motion, and glowing intensity.',
          variations: 1
        },
        {
          name: 'Gym Rétro 80s',
          gender: 'g',
          style_key: 'vintage_gym',
          description: 'Style affiche de gym vintage des années 80',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vintage_gym.jpg',
          prompt: 'Make this into a vintage 1980s gym poster with neon tracksuits, retro typography, and grainy textures.',
          variations: 1
        },
        {
          name: 'Illustration Olympique',
          gender: 'g',
          style_key: 'olympic_illustration',
          description: 'Style minimaliste inspiré des Jeux Olympiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/olympic_illustration.jpg',
          prompt: 'Make this into a minimalist Olympic-style illustration with clean lines, symbolic motion, and national colors.',
          variations: 1
        },
        {
          name: 'Sports Extrêmes',
          gender: 'g',
          style_key: 'extreme_sports',
          description: 'Style graphique de sports extrêmes avec couleurs vives',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/extreme_sports.jpg',
          prompt: 'Make this into an extreme sports graphic with bold colors, high contrast, and a gritty urban backdrop.',
          variations: 1
        },
        {
          name: 'Basket de Rue',
          gender: 'g',
          style_key: 'street_basketball',
          description: 'Style basketball urbain avec graffiti et action',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/street_basketball.jpg',
          prompt: 'Make this into a street basketball scene with graffiti, dramatic lighting, and mid-air action.'
        },
        {
          name: 'Pub Sportswear',
          gender: 'g',
          style_key: 'fashion_sportswear',
          description: 'Style publicité haut de gamme pour vêtements de sport',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/fashion_sportswear.jpg',
          prompt: 'Make this into a high-fashion sportswear ad with sleek design, strong silhouettes, and cool-toned filters.',
          variations: 1
        },
        {
          name: 'Arts Martiaux',
          gender: 'g',
          style_key: 'martial_arts',
          description: 'Style illustration d\'arts martiaux à l\'encre',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/martial_arts.jpg',
          prompt: 'Make this into a traditional martial arts ink illustration with brushstroke motion and zen atmosphere.',
          variations: 1
        },
        {
          name: 'Match de Football',
          gender: 'g',
          style_key: 'soccer_action',
          description: 'Style action de football capturée en plein mouvement',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/soccer_action.jpg',
          prompt: 'Make this into a soccer match moment captured mid-action with flying dirt, dramatic lighting, and energetic blur.',
          variations: 1
        },
        {
          name: 'Combat de Boxe',
          gender: 'g',
          style_key: 'boxing_cinematic',
          description: 'Style cinématographique de combat de boxe',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/boxing_cinematic.jpg',
          prompt: 'Make this into a boxing ring showdown in cinematic style, with sweat, motion blur, and gritty shadows.',
          variations: 1
        },
        {
          name: 'Snowboard',
          gender: 'g',
          style_key: 'snowboarding',
          description: 'Style affiche de snowboard avec neige stylisée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/snowboarding.jpg',
          prompt: 'Make this into poster with stylized powder trails, frozen tones, and dynamic angles.',
          variations: 1
        },
        {
          name: 'Skateboard 90s',
          gender: 'g',
          style_key: 'skateboarding_zine',
          description: 'Style graphique de zine de skateboard des années 90',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/skateboarding_zine.jpg',
          prompt: 'Make this into a 90s skateboarding zine graphic with bold outlines, stickers, and rebellious textures.',
          variations: 1
        },
        {
          name: 'E-sport Futuriste',
          gender: 'g',
          style_key: 'esports_futuristic',
          description: 'Style tournoi d\'e-sport futuriste avec hologrammes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/esports_futuristic.jpg',
          prompt: 'Make this into a futuristic e-sports tournament setting with holograms, LEDs, and team branding.',
          variations: 1
        },
        {
          name: 'Formule 1',
          gender: 'g',
          style_key: 'formula_one',
          description: 'Style Formule 1 avec traces de mouvement et vitesse',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/formula_one.jpg',
          prompt: 'Make this into race scene with motion streaks, aerodynamic design, and high-speed intensity.',
          variations: 1
        },
        {
          name: 'Yoga Stylisé',
          gender: 'g',
          style_key: 'stylized_yoga',
          description: 'Style composition de yoga avec poses fluides',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/stylized_yoga.jpg',
          prompt: 'Make this into a stylized yoga composition with flowing poses, mandala patterns, and soft gradients.',
          variations: 1
        },
        {
          name: 'Parkour Urbain',
          gender: 'g',
          style_key: 'rooftop_parkour',
          description: 'Style scène de parkour sur les toits avec angles inclinés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/rooftop_parkour.jpg',
          prompt: 'Make this into scene on rooftops with tilted angles, city lights, and freeze-frame motion.',
          variations: 1
        },
        {
          name: 'Tennis Rétro',
          gender: 'g',
          style_key: 'retro_tennis',
          description: 'Style graphique de court de tennis rétro avec tons pastel',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/retro_tennis.jpg',
          prompt: 'Make this into a retro tennis court graphic with pastel tones, grainy paper texture, and vintage rackets.',
          variations: 1
        },
        {
          name: 'Volleyball de Plage',
          gender: 'g',
          style_key: 'beach_volleyball',
          description: 'Style affiche de volleyball de plage avec éclats de soleil',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/beach_volleyball.jpg',
          prompt: 'Make this into a beach volleyball poster with sun flares, glowing skin tones, and dynamic sand spray.',
          variations: 1
        },
        
        {
          name: 'Intro Équipe Basketball',
          gender: 'g',
          style_key: 'basketball_intro',
          description: 'Style présentation d\'équipe de basketball professionnelle',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/basketball_intro.jpg',
          prompt: 'Make this into a professional basketball team introduction with explosive lighting and bold team branding.',
          variations: 1
        }, 
        {
          name: 'Intro Équipe Football',
          gender: 'g',
          style_key: 'football_intro',
          description: 'Style présentation d\'équipe de football  professionnelle',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/football_intro.jpg',
          prompt: 'Make this into a professional soccer team  with explosive lighting and bold team branding.',
          variations: 1
        }
      ]
    },
    {
      id: 'futuriste',
      name: 'Collection Futuriste',
      description: 'Styles avant-gardistes inspirés de la science-fiction et du futur',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/futuriste.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Cityscape Cyberpunk',
          gender: 'g',
          style_key: 'cyberpunk_city',
          description: 'Paysage urbain cyberpunk avec néons et gratte-ciels futuristes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/cyberpunk_city.jpg',
          prompt: 'Make this into a neon-lit cyberpunk cityscape with towering skyscrapers, flying vehicles, and glowing signs.',
          variations: 1
        },
        {
          name: 'Exosquelette High-Tech',
          gender: 'g',
          style_key: 'high_tech_exosuit',
          description: 'Combinaison exosquelette futuriste avec détails chromés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/high_tech_exosuit.jpg',
          prompt: 'Make this into a high-tech exosuit design with chrome plating, hydraulic limbs, and glowing power cores.',
          variations: 1
        },
        {
          name: 'Colonie Spatiale',
          gender: 'g',
          style_key: 'space_colony',
          description: 'Environnement de colonie spatiale avec habitats artificiels',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/space_colony.jpg',
          prompt: 'Make this into a post-Earth space colony environment with artificial habitats, domes, and alien vegetation.',
          variations: 1
        },
        {
          name: 'Symphonie Robotique',
          gender: 'g',
          style_key: 'robotic_symphony',
          description: 'Scène de musiciens robotiques avec effets lumineux synchronisés',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/robotic_symphony.jpg',
          prompt: 'Make this into a robotic symphony scene with mechanical musicians and synchronized digital light effects.',
          variations: 1
        },
        {
          name: 'Interface Holographique',
          gender: 'g',
          style_key: 'holographic_interface',
          description: 'Affichage holographique avec panneaux de données flottants',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/holographic_interface.jpg',
          prompt: 'Make this into a holographic interface display with floating data panels, 3D maps, and sci-fi UI elements.',
          variations: 1
        },
        {
          name: 'Convoi du Désert Futuriste',
          gender: 'g',
          style_key: 'future_desert_convoy',
          description: 'Convoi futuriste dans le désert avec véhicules en lévitation',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/future_desert_convoy.jpg',
          prompt: 'Make this into a futuristic desert convoy with hovering vehicles, sand-resistant armor, and sci-fi survival gear.',
          variations: 1
        },
        {
          name: 'Métropole IA',
          gender: 'g',
          style_key: 'ai_metropolis',
          description: 'Métropole gouvernée par l\'IA avec architecture géométrique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/ai_metropolis.jpg',
          prompt: 'Make this into an AI-governed metropolis with geometric architecture, surveillance drones, and pristine order.',
          variations: 1
        },
        {
          name: 'Lounge Rétro-Futuriste',
          gender: 'g',
          style_key: 'retro_future_lounge',
          description: 'Salon rétro-futuriste mêlant design mid-century et technologie',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/retro_future_lounge.jpg',
          prompt: 'Make this into a retro-futuristic lounge with mid-century design mixed with glowing tech and space age decor.',
          variations: 1
        },
        {
          name: 'Expérience de Voyage Temporel',
          gender: 'g',
          style_key: 'time_travel_glitch',
          description: 'Expérience de voyage dans le temps ratée avec réalité déformée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/time_travel_glitch.jpg',
          prompt: 'Make this into a time travel experiment gone wrong, with bent reality, multiple timelines, and glitching effects.'
        },
        {
          name: 'Arène Sci-Fi',
          gender: 'g',
          style_key: 'scifi_gladiator',
          description: 'Arène de gladiateurs futuriste avec armes à énergie',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/scifi_gladiator.jpg',
          prompt: 'Make this into a sci-fi gladiator arena with energy weapons, forcefields, and roaring alien crowds.',
          variations: 1
        },
        {
          name: 'Rébellion Androïde',
          gender: 'g',
          style_key: 'android_rebellion',
          description: 'Scène de rébellion d\'androïdes avec étincelles et néons',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/android_rebellion.jpg',
          prompt: 'Make this into an android rebellion scene with sparks flying, broken restraints, and neon-lit resistance.',
          variations: 1
        },
      
  
        {
          name: 'Chambre de Stase Spatiale',
          gender: 'g',
          style_key: 'space_stasis',
          description: 'Chambre de stase dans l\'espace profond avec caissons cryogéniques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/space_stasis.jpg',
          prompt: 'Make this into a deep space stasis chamber with translucent cryo-pods and bioluminescent control panels.',
          variations: 1
        },
        {
          name: 'Course de Drones',
          gender: 'g',
          style_key: 'drone_race',
          description: 'Course de drones dans des ruines cyber abandonnées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/drone_race.jpg',
          prompt: 'Make this into a drone race through abandoned cyber ruins with speed trails, light rings, and explosive action.',
          variations: 1
        },
        {
          name: 'Fusion Biomécanique',
          gender: 'g',
          style_key: 'biomechanical_fusion',
          description: 'Scène de fusion biomécanique, mélange d\'organique et de synthétique',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/biomechanical_fusion.jpg',
          prompt: 'Make this into biomechanicals fusion scene with organic elements.',
          variations: 1
        },
        {
          name: 'Au-delà Numérique',
          gender: 'g',
          style_key: 'digital_afterlife',
          description: 'Concept d\'au-delà numérique avec formes d\'avatars et âmes pixélisées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/digital_afterlife.jpg',
          prompt: 'Make this into a digital afterlife concept with avatar forms, pixel souls, and endless virtual horizon.'
        },
        {
          name: 'Défilé Intergalactique',
          gender: 'g',
          style_key: 'intergalactic_fashion',
          description: 'Défilé de mode intergalactique avec tenues avant-gardistes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/intergalactic_fashion.jpg',
          prompt: 'Make this into an intergalactic fashion show with avant-garde outfits, zero-gravity catwalks, and alien fabrics.',
          variations: 1
        },
        {
          name: 'Réseau Neuronal',
          gender: 'g',
          style_key: 'neural_network',
          description: 'Visualisation de réseau neuronal avec pensées flottantes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/neural_network.jpg',
          prompt: 'Make this into a neural network visualization with floating thoughts, synaptic bridges, and shimmering code.',
          variations: 1
        },
        {
          name: 'Green Aliens',
          gender: 'g',
          style_key: 'green_aliens',
          description: 'Scene avec des extraterrestres verts dans un environnement futuriste',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/green_aliens.jpg',
          prompt: 'Make this into martian background with green alien .',
          variations: 1
        }
      ]
    },
    {
      id: 'villes-iconiques',
      name: 'Collection Villes Iconiques',
      description: 'Styles inspirés des grandes villes et métropoles du monde',
      image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/villes-iconiques.jpg',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'New York Nocturne',
          gender: 'g',
          style_key: 'new_york_night',
          description: 'Vue nocturne de New York avec gratte-ciels illuminés et taxis jaunes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/new_york_night.jpg',
          prompt: 'Make this into a night view of New York City with glowing skyscrapers, yellow taxis, and Times Square lights.',
          variations: 1
        },
        {
          name: 'Paris Rêveur',
          gender: 'g',
          style_key: 'dreamy_paris',
          description: 'Rue parisienne de rêve avec la Tour Eiffel en arrière-plan',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/dreamy_paris.jpg',
          prompt: 'Make this into a dreamy Parisian street with the Eiffel Tower in the distance, vintage cafés, and golden hour light.',
          variations: 1
        },
       
        {
          name: 'Tokyo Animé',
          gender: 'g',
          style_key: 'tokyo_alley',
          description: 'Ruelle animée de Tokyo avec enseignes néon et distributeurs automatiques',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/tokyo_alley.jpg',
          prompt: 'Make this into a bustling Tokyo alleyway with neon signs',
          variations: 1
        },
    
        {
          name: 'Rio Ensoleillé',
          gender: 'g',
          style_key: 'rio_beach',
          description: 'Plage de Rio avec le Christ Rédempteur surplombant Copacabana',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/rio_beach.jpg',
          prompt: 'Make this into a Rio de Janeiro beach scene with Christ the Redeemer towering above and a lively Copacabana.',
          variations: 1
        },
        {
          name: 'Rome Antique',
          gender: 'g',
          style_key: 'rome_sunset',
          description: 'Vue majestueuse de Rome avec ruines antiques et Colisée au coucher du soleil',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/rome_sunset.jpg',
          prompt: 'Make this into a majestic view of Rome with ancient ruins.',
          variations: 1
        },
       
        {
          name: 'Los Angeles Sunset',
          gender: 'g',
          style_key: 'la_sunset',
          description: 'Coucher de soleil à Los Angeles avec palmiers et signe Hollywood',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/la_sunset.jpg',
          prompt: 'Make this into a Los Angeles sunset with palm trees.'
        },
        
        {
          name: 'Istanbul Historique',
          gender: 'g',
          style_key: 'istanbul_twilight',
          description: 'Rue historique d\'Istanbul avec dômes et minarets au crépuscule',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/istanbul_twilight.jpg',
          prompt: 'Make this into a historic Istanbul ',
          variations: 1
        },
        {
          name: 'Berlin Urbain',
          gender: 'g',
          style_key: 'berlin_wall',
          description: 'Scène de graffiti du mur de Berlin avec textures post-industrielles',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/berlin_wall.jpg',
          prompt: 'Make this into a Berlin wall graffiti scene with post-industrial textures, murals, and urban cool.',
          variations: 1
        },
     
        {
          name: 'Bangkok Nocturne',
          gender: 'g',
          style_key: 'bangkok_night',
          description: 'Marché nocturne animé de Bangkok avec lanternes et tuk-tuks',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/bangkok_night.jpg',
          prompt: 'Make this into a lively Bangkok night market with lanterns, tuk-tuks, street food stalls, and vibrant signs.',
          variations: 1
        },
        {
          name: 'Moscou Enneigée',
          gender: 'g',
          style_key: 'snowy_moscow',
          description: 'Vue enneigée de Moscou avec la Cathédrale Saint-Basile et rues glacées',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/snowy_moscow.jpg',
          prompt: 'Make this into a snowy view of Moscow ',
          variations: 1
        },
        {
          name: 'Mumbai Vivant',
          gender: 'g',
          style_key: 'vibrant_mumbai',
          description: 'Rue vibrante de Mumbai avec rickshaws, saris colorés et affiches Bollywood',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vibrant_mumbai.jpg',
          prompt: 'Make this into a vibrant Mumbai street with honking rickshaws.',
          variations: 1
        },
       
      
        {
          name: 'Séoul Moderne',
          gender: 'g',
          style_key: 'seoul_crosswalk',
          description: 'Passage piéton animé de Séoul avec panneaux numériques et bâtiments modernes',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/seoul_crosswalk.jpg',
          prompt: 'Make this into a busy Seoul crosswalk with digital billboards.',
          variations: 1
        },
        {
          name: 'La Havane Classique',
          gender: 'g',
          style_key: 'havana_street',
          description: 'Scène de rue classique de La Havane avec bâtiments coloniaux pastel et voitures vintage',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/havana_street.jpg',
          prompt: 'Make this into a classic Havana street scene with pastel colonial buildings, vintage cars, and tropical light.',
          variations: 1
        }
      ]
    },
    
    // ...existing code...
  ];

  // Fonction pour ouvrir le popup de détails avec les styles du template
  const openDetailsPopup = (templateId) => {
    const template = styleTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      // Initialiser les styles avec le genre par défaut 'g' (général/neutre) pour le nouveau processus
      const stylesWithGender = template.styles.map(style => ({
        ...style,
        gender: 'g', // Utiliser 'g' comme valeur par défaut pour tous les styles
        selected: true, // Présélectionner tous les styles par défaut
        tags: style.tags || getTagsForStyle(template.id, style.name) // Utiliser la fonction helper pour déterminer les tags
      }));
      
      setTemplateStyles(stylesWithGender);
      // Initialiser les styles sélectionnés avec tous les styles
      setSelectedStyles(stylesWithGender.map((_, index) => index));
      setShowDetailsPopup(true);
    }
  };

  // Fonction pour gérer la sélection d'un style
  const toggleStyleSelection = (index) => {
    const updatedStyles = [...templateStyles];
    updatedStyles[index].selected = !updatedStyles[index].selected;
    setTemplateStyles(updatedStyles);
    
    if (updatedStyles[index].selected) {
      setSelectedStyles(prev => [...prev, index]);
    } else {
      setSelectedStyles(prev => prev.filter(i => i !== index));
    }
  };

  // Fonction pour sélectionner/désélectionner tous les styles
  const toggleSelectAll = () => {
    const allSelected = templateStyles.every(style => style.selected);
    const updatedStyles = templateStyles.map(style => ({
      ...style,
      selected: !allSelected
    }));
    
    setTemplateStyles(updatedStyles);
    
    if (allSelected) {
      // Tout désélectionner
      setSelectedStyles([]);
    } else {
      // Tout sélectionner
      setSelectedStyles(updatedStyles.map((_, index) => index));
    }
  };

  // Fonction modifiée pour appliquer le template avec les prompts
  const applyTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      
      // Récupérer le type de projet pour validation
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('photobooth_type')
        .eq('id', projectId)
        .single();
        
      if (projectError) throw projectError;
      
      // Vérifier la compatibilité
      if (!selectedTemplate.compatibleWith.includes(projectData.photobooth_type)) {
        throw new Error(`Ce template n'est pas compatible avec ce type de photobooth (${projectData.photobooth_type})`);
      }
      
      // Insérer uniquement les styles sélectionnés dans la base de données
      const selectedStylesData = templateStyles
        .filter(style => style.selected)
        .map(style => ({
          project_id: projectId,
          name: style.name,
          gender: style.gender || 'g',
          style_key: style.style_key,
          preview_image: style.preview_image,
          description: style.description,
          prompt: style.prompt, // Ajouter le prompt pour le nouveau modèle
          is_active: true,
          variations: style.variations || 1,
          // tags: style.tags || getTagsForStyle(selectedTemplate.id, style.name) // Utiliser les tags définis ou calculer les bons tags
        }));
      
      if (selectedStylesData.length === 0) {
        throw new Error("Veuillez sélectionner au moins un style");
      }
      
      const { data, error } = await supabase
        .from('styles')
        .insert(selectedStylesData)
        .select();
        
      if (error) throw error;
      
      // When styles are successfully added, make sure to call the callback:
      // Example of what your add function might look like:
      const handleAddStyles = async (templateStyles) => {
        try {
          setAddingStyles(true);
          setError(null);
          
          console.log(`Adding ${templateStyles.length} styles from template`);
          
          // Your existing code to add styles to the database
          // ...
          
          // After successful addition of styles
          console.log('Successfully added styles to database');
          
          // Important: Call the callback with the added styles
          if (typeof onStylesAdded === 'function') {
            onStylesAdded(templateStyles);
          }
          
        } catch (error) {
          console.error('Error adding styles:', error);
          setError(error.message || 'Une erreur est survenue lors de l\'ajout des styles');
          
          // Call error callback if provided
          if (typeof onError === 'function') {
            onError(error.message || 'Une erreur est survenue lors de l\'ajout des styles');
          }
        } finally {
          setAddingStyles(false);
        }
      };
      
      setShowDetailsPopup(false);
      setSelectedTemplate(null);
      
    } catch (error) {
      console.error('Error applying template:', error);
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Options de genre disponibles - Simplifier pour n'avoir que l'option Groupe/Neutre
  const getGenderOptions = () => {
    return [
      { value: 'g', label: 'Général (tous)' }
    ];
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">Templates de styles prédéfinis</h3>
        <p className="text-sm text-gray-500 mt-1">
          Sélectionnez un ensemble de styles prédéfinis pour votre projet ({photoboothType})
        </p>
      </div>
      
      {/* Remplacer la section d'affichage des templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {styleTemplates
          .filter(template => template.compatibleWith.includes(photoboothType))
          .map(template => (
            <div 
              key={template.id}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                selectedTemplate === template.id 
                  ? 'ring-2 ring-indigo-500 border-indigo-500' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => openDetailsPopup(template.id)} // Modifié pour ouvrir le popup
            >
              <div className="h-80 relative">
                {/* Remplacer Image par img standard */}
                <img
                  src={template.image}
                  alt={template.name}
                  className="rounded-t-lg w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`Failed to load image: ${template.image}`);
                    e.target.onerror = null;
                    e.target.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                  }}
                />
              </div>
              <div className="p-4">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                <p className="text-xs text-gray-400 mt-2">{template.styles.length} styles</p>
              </div>
            </div>
          ))}
      </div>
      
      {/* Popup de détails des styles avec sélection de genre */}
      {showDetailsPopup && selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-4xl transform transition-all">
            <div className="relative">
              {/* Header avec image de couverture et titre */}
              <div className="h-40 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center opacity-40" 
                     style={{ backgroundImage: `url(${selectedTemplate.image})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <h3 className="text-2xl font-bold">{selectedTemplate.name}</h3>
                  <p className="text-gray-200 text-sm mt-1">{selectedTemplate.description}</p>
                </div>
                {/* Bouton de fermeture */}
                <button 
                  onClick={() => setShowDetailsPopup(false)}
                  className="absolute top-4 right-4 bg-black bg-opacity-40 rounded-full p-2 text-white hover:bg-opacity-60 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-white">
                    <span className="text-gray-300">{templateStyles.length} styles disponibles</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-300">{selectedStyles.length} sélectionnés</span>
                  </div>
                  
                  {/* Select all button */}
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {templateStyles.every(style => style.selected) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      )}
                    </svg>
                    {templateStyles.every(style => style.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto p-2">
                  {templateStyles.map((style, index) => (
                    <div 
                      key={index} 
                      className={`relative bg-gray-800 rounded-xl overflow-hidden transition-all border ${
                        style.selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-gray-700'
                      }`}
                    >
                      {/* Checkbox pour sélection */}
                      <div 
                        className="absolute top-2 right-2 z-10 p-1 bg-black bg-opacity-60 rounded-md cursor-pointer"
                        onClick={() => toggleStyleSelection(index)}
                      >
                        <div className={`w-5 h-5 flex items-center justify-center rounded ${
                          style.selected ? 'bg-indigo-600' : 'bg-gray-700'
                        }`}>
                          {style.selected && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      {/* Aperçu du style - Hauteur augmentée de h-40 à h-56 */}
                      <div 
                        className="h-56 cursor-pointer" 
                        onClick={() => toggleStyleSelection(index)}
                      >
                        {style.preview_image ? (
                          <img
                            src={style.preview_image}
                            alt={style.name}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                            onError={(e) => {
                              console.error(`Failed to load style preview: ${style.preview_image}`);
                              e.target.onerror = null;
                              e.target.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-700">
                            <span className="text-gray-400">Aucune image</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 text-white">
                        <h4 className="font-medium text-md">{style.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{style.description}</p>
                        
                        {/* Affichage des tags individuels */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(style.tags || getTagsForStyle(selectedTemplate.id, style.name)).map((tag, tagIndex) => (
                            <span 
                              key={tagIndex} 
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                tag === 'homme' ? 'bg-blue-600/30 text-blue-300 border border-blue-600' :
                                tag === 'femme' ? 'bg-pink-600/30 text-pink-300 border border-pink-600' :
                                'bg-purple-600/30 text-purple-300 border border-purple-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* Genre selection if needed */}
                        <div className="mt-3">
                          <select
                            value={style.gender}
                            onChange={(e) => updateStyleGender(index, e.target.value)}
                            className="w-full py-1 px-2 text-xs bg-gray-700 text-white border border-gray-600 rounded focus:ring-1 focus:ring-indigo-500"
                          >
                            {getGenderOptions().map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer with action buttons */}
              <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDetailsPopup(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={applyTemplate}
                  disabled={loading || selectedStyles.length === 0}
                  className={`px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center ${
                    loading || selectedStyles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Application en cours...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Appliquer {selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}