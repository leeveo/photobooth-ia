'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

  // Définition des templates de styles
  const styleTemplates = [
    {
      id: 'paint-magic',
      name: 'Collection Paint Magic',
      description: 'Des couleurs éclatantes et des motifs uniques',
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/paint-magic.jpeg',
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
        }
      ]
    },
    {
      id: 'vangogh',
      name: 'Collection Van Gogh',
      description: 'Styles inspirés par Van Gogh',
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/vangogh.png',
      compatibleWith: ['premium'],
      styles: [
        {
          name: 'Nuit étoilée',
          gender: 'g',
          style_key: 'starry_night',
          description: 'Style inspiré de la Nuit étoilée',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/starry-night.jpg',
          prompt: 'Transform this portrait in the style of Van Gogh\'s Starry Night, with swirling patterns and thick brushstrokes',
          variations: 1
        },
        {
          name: 'Autoportrait',
          gender: 'g',
          style_key: 'vangogh_portrait',
          description: 'Style des autoportraits de Van Gogh',
          preview_image: 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/vangogh-portrait.jpg',
          prompt: 'Transform this portrait in the style of Van Gogh\'s self-portraits, with thick impasto and expressive brushwork',
          variations: 1
        }
      ]
    },
    {
      id: 'cartoon',
      name: 'Collection Cartoon',
      description: 'Styles de dessins animés',
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/cartoon.jpg',
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
        }
      ]
    },
    {
      id: 'vintage',
      name: 'Collection Vintage',
      description: 'Styles rétro des années 50-70',
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/vintage.jpg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/western.jpg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/fantasy.jpg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/business.jpg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-ghibli.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-pixar.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-manga.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-empire.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-plastic.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-caricature.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-impressionnniste.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-painting.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-clay.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-milo.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-drawing.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-kitchen.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/minimax-psycho.jpeg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/avatar-fashion.jpg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/avatar-fantasy.jpg',
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
      image: process.env.NEXT_PUBLIC_BASE_URL + '/style-templates/avatar-professional.jpg',
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
    }
  ];

  // Fonction pour ouvrir le popup de détails avec les styles du template
  const openDetailsPopup = (templateId) => {
    const template = styleTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      // Initialiser les styles avec le genre par défaut 'g' (général/neutre) pour le nouveau processus
      const stylesWithGender = template.styles.map(style => ({
        ...style,
        gender: 'g' // Utiliser 'g' comme valeur par défaut pour tous les styles
      }));
      
      setTemplateStyles(stylesWithGender);
      setShowDetailsPopup(true);
    }
  };

  // Simplifier la fonction de modification du genre car nous utilisons toujours 'g'
  const updateStyleGender = (styleIndex, gender) => {
    const updatedStyles = [...templateStyles];
    updatedStyles[styleIndex].gender = gender;
    setTemplateStyles(updatedStyles);
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
      
      // Insérer les styles dans la base de données avec leurs prompts
      const stylesData = templateStyles.map(style => ({
        project_id: projectId,
        name: style.name,
        gender: style.gender || 'g',
        style_key: style.style_key,
        preview_image: style.preview_image,
        description: style.description,
        prompt: style.prompt, // Ajouter le prompt pour le nouveau modèle
        is_active: true,
        variations: style.variations || 1,
      }));
      
      const { data, error } = await supabase
        .from('styles')
        .insert(stylesData)
        .select();
        
      if (error) throw error;
      
      onStylesAdded(data);
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
                    e.target.src = '/placeholder-style.png';
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
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                 onClick={() => setShowDetailsPopup(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {styleTemplates.find(t => t.id === selectedTemplate?.id)?.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {styleTemplates.find(t => t.id === selectedTemplate?.id)?.description}
                    </p>
                    
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aperçu
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nom
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Genre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {templateStyles.map((style, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {style.preview_image && (
                                  <div className="w-12 h-16 relative">
                                    <img
                                      src={style.preview_image}
                                      alt={style.name}
                                      className="rounded-sm w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error(`Failed to load style preview: ${style.preview_image}`);
                                        e.target.onerror = null;
                                        e.target.src = '/placeholder-style.png';
                                      }}
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{style.name}</div>
                                <div className="text-sm text-gray-500">{style.style_key}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <select
                                  value={style.gender}
                                  onChange={(e) => updateStyleGender(index, e.target.value)}
                                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                  {getGenderOptions().map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{style.description}</div>
                                {style.prompt && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    Prompt: {style.prompt.substring(0, 50)}...
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={applyTemplate}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-br from-blue-500 to-purple-600 text-base font-medium text-white hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Application en cours...' : 'Appliquer ces styles'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailsPopup(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}