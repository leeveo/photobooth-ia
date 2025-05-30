import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'

export async function POST(req: Request) {
  try {
    const { images, overlap = -150, theme, step = 1, blackBgImage, transparentImage } = await req.json()

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Aucune image sélectionnée' }, { status: 400 })
    }

    if (step !== 1 && !theme) {
      return NextResponse.json({ error: 'Aucun fond sélectionné' }, { status: 400 })
    }

    const publicDir = path.join(process.cwd(), 'public')
    const outputDir = path.join(publicDir, 'fresque')
    const bgPath = path.join(publicDir, 'fresque', theme?.file || '')
    
    // Chemins des fichiers de sortie pour chaque étape
    const blackBgFresqueFile = 'fresque_black_bg.png'
    const transparentFresqueFile = 'fresque_transparent.png'
    const outputVideoFile = 'fresque_scroll.mp4'
    
    // Standard dimensions
    const IMAGE_WIDTH = 640
    const DEFAULT_IMAGE_HEIGHT = 480
    const MAX_IMAGE_HEIGHT = 800 // Nouvelle limite pour éviter des fresques trop hautes
    
    const blackBgFresquePath = path.join(outputDir, blackBgFresqueFile)
    const transparentFresquePath = path.join(outputDir, transparentFresqueFile)
    const outputVideoPath = path.join(outputDir, outputVideoFile)

    // Vérification des fichiers
    if (step > 1 && theme && !fs.existsSync(bgPath)) {
      console.error('❌ Fond introuvable:', bgPath)
      return NextResponse.json({ error: 'Image de fond introuvable' }, { status: 400 })
    }

    const inputFiles = images.map(imgPath => path.join(publicDir, imgPath))
    console.log(`🔍 Étape ${step}: Images à traiter:`, inputFiles)

    for (const file of inputFiles) {
      if (!fs.existsSync(file)) {
        console.error('❌ Image introuvable:', file)
        return NextResponse.json({ error: `Image introuvable: ${file}` }, { status: 400 })
      }
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // ÉTAPE 1: Génération de la fresque avec transparence
    if (step === 1) {
      console.log('⚙️ ÉTAPE 1: Génération de la fresque avec transparence 100%')
      
      // Obtenir la hauteur maximale de toutes les images sélectionnées
      let heights = [];
      let maxHeight = DEFAULT_IMAGE_HEIGHT; // Valeur par défaut au cas où
      console.log('🔍 Détermination de la hauteur maximale des images...')
      
      for (const inputFile of inputFiles) {
        try {
          const dimensions = await new Promise<{ height: number }>((resolve, reject) => {
            exec(
              `ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "${inputFile}"`,
              (err, stdout) => {
                if (err) {
                  console.error(`❌ Erreur obtention hauteur pour ${inputFile}:`, err)
                  return reject(err);
                }
                resolve({ height: Number(stdout.trim()) })
              }
            )
          });
          
          heights.push(dimensions.height);
          console.log(`📏 Image ${path.basename(inputFile)} hauteur: ${dimensions.height}px`)
        } catch (err) {
          console.error(`⚠️ Impossible d'obtenir les dimensions de ${inputFile}, utilisation de la hauteur par défaut:`, err)
        }
      }
      
      // Calculer la hauteur moyenne et limiter la hauteur maximale
      if (heights.length > 0) {
        // Calculer la moyenne des hauteurs
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        console.log(`📏 Hauteur moyenne des images: ${avgHeight.toFixed(0)}px`);
        
        // Si la hauteur maximale est trop différente de la moyenne, on la limite
        maxHeight = Math.min(
          Math.max(...heights), 
          MAX_IMAGE_HEIGHT,
          // Limiter à 1.5x la hauteur moyenne pour éviter les valeurs aberrantes
          avgHeight * 1.5
        );
      }
      
      console.log(`📏 Hauteur finale utilisée pour la fresque: ${maxHeight}px`)
      
      // Calcul de la largeur totale avec overlap pour la première étape
      const totalWidth = images.length * IMAGE_WIDTH + (images.length - 1) * overlap
      console.log(`📏 Largeur totale de la fresque avec overlap: ${totalWidth}px`)
      
      // Create an array of input file arguments
      const inputs = inputFiles.map(file => `-i "${file}"`).join(' ')
      
      // Create a completely different approach that doesn't use an initial canvas at all
      // Instead, we'll directly composite the images with transparency
      const filterParts = []
      
      // Scale each input image preserving aspect ratio and apply padding with transparency
      for (let i = 0; i < inputFiles.length; i++) {
        filterParts.push(`[${i}:v]scale=${IMAGE_WIDTH}:-1:flags=lanczos,pad=${IMAGE_WIDTH}:${maxHeight}:(ow-iw)/2:(oh-ih)/2:color=black@0[img${i}]`)
      }
      
      // Set up the width and position of the final output canvas
      let outputWidth = totalWidth
      if (outputWidth < 0) outputWidth = inputFiles.length * IMAGE_WIDTH // Fallback if overlap makes width negative
      
      // Create the base transparent canvas to place images on
      filterParts.push(`color=c=black@0:s=${outputWidth}x${maxHeight}[base]`)
      
      // Overlay each image at calculated positions
      let lastOutput = 'base'
      for (let i = 0; i < inputFiles.length; i++) {
        const x = i * (IMAGE_WIDTH + overlap)
        filterParts.push(`[${lastOutput}][img${i}]overlay=${x}:0:format=auto${i < inputFiles.length - 1 ? `[out${i}]` : ''}`)
        lastOutput = `out${i}`
      }
      
      // Final filter to ensure output is RGBA format
      const filterGraph = filterParts.join(';') + ',format=rgba'
      
      // Use a single clean command to generate the fresque
      // This avoids any intermediate files with potential black backgrounds
      const fullCmd = `ffmpeg -y ${inputs} -filter_complex "${filterGraph}" -frames:v 1 "${blackBgFresquePath}"`
      
      console.log('▶️ Génération fresque avec transparence totale:', fullCmd)
      
      await new Promise<void>((resolve, reject) => {
        exec(fullCmd, (err, stdout, stderr) => {
          if (err) {
            console.error('❌ Erreur génération fresque transparent:', stderr)
            return reject(err)
          }
          console.log('✅ Fresque créée avec succès sans fond')
          resolve()
        })
      })
      
      return NextResponse.json({
        message: '✅ Fresque avec transparence totale générée',
        blackBgImage: `/fresque/${blackBgFresqueFile}`,
        totalWidth,
        maxHeight,
        uploaded: [],
        transparentFromStep1: true
      })
    }
    
    // Pour les étapes 2 et 3
    else if (step === 2 && blackBgImage) {
      console.log('⚙️ ÉTAPE 2: Vérification/amélioration de la transparence')
      
      const inputBlackBgFresque = path.join(publicDir, blackBgImage.replace(/^\//, ''))
      
      if (!fs.existsSync(inputBlackBgFresque)) {
        return NextResponse.json({ error: 'Image fresque introuvable', uploaded: [] }, { status: 400 })
      }
      
      // Check if the image already has transparency
      const hasAlpha = await new Promise<boolean>((resolve) => {
        exec(
          `ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "${inputBlackBgFresque}"`,
          (err, stdout) => {
            const pixFmt = stdout.trim()
            resolve(pixFmt.includes('rgba') || pixFmt.includes('yuva') || pixFmt.includes('alpha'))
          }
        )
      }).catch(() => false)
      
      if (hasAlpha) {
        console.log('✅ L\'image a déjà un canal alpha, étape 2 simplifiée.')
        // Just copy the file as is, since it already has transparency
        fs.copyFileSync(inputBlackBgFresque, transparentFresquePath)
      } else {
        // If somehow the image doesn't have transparency yet, use colorkey as before
        console.log('⚠️ L\'image n\'a pas de canal alpha, application de colorkey.')
        const colorKeyCmd = `ffmpeg -y -i "${inputBlackBgFresque}" -filter_complex "colorkey=0x141414:0.002:0.02,format=rgba" "${transparentFresquePath}"`
        
        await new Promise<void>((resolve, reject) => {
          exec(colorKeyCmd, (err, stdout, stderr) => {
            if (err) {
              console.error('❌ Erreur colorkey:', stderr)
              return reject(err)
            }
            resolve()
          })
        })
      }
      
      return NextResponse.json({
        message: '✅ Fresque avec transparence validée',
        transparentImage: `/fresque/${transparentFresqueFile}`,
        uploaded: []
      })
    }
    
    // ÉTAPE 3: Génération de la vidéo avec défilement
    else if (step === 3 && transparentImage && theme) {
      console.log('⚙️ ÉTAPE 3: Génération de la vidéo avec défilement')
      
      // Chemin du fichier d'entrée (URL relative vers chemin absolu)
      const inputTransparentFresque = path.join(publicDir, transparentImage.replace(/^\//, ''))
      
      if (!fs.existsSync(inputTransparentFresque)) {
        return NextResponse.json({ error: 'Image fresque transparente introuvable' }, { status: 400 })
      }
      
      // Obtenir les dimensions de la fresque transparente
      const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
        exec(
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputTransparentFresque}"`,
          (err, stdout) => {
            if (err) {
              console.error('❌ Erreur obtention dimensions:', err)
              return reject(err)
            }
            const [width, height] = stdout.trim().split(',').map(Number)
            resolve({ width, height })
          }
        )
      })
      
      const fresqueWidth = dimensions.width;
      const fresqueHeight = dimensions.height;
      
      console.log(`📏 Dimensions de la fresque transparente: ${fresqueWidth}x${fresqueHeight}px`)
      
      // Préparer le fond à la taille adaptée
      const bgResized = path.join(outputDir, 'bg_sized.jpg')
      const bgCmd = `ffmpeg -y -i "${bgPath}" -vf "scale=${IMAGE_WIDTH}:${fresqueHeight}" "${bgResized}"`
      console.log('▶️ Préparation fond:', bgCmd)
      
      await new Promise<void>((resolve, reject) => {
        exec(bgCmd, (err, stdout, stderr) => {
          if (err) {
            console.error('❌ Erreur préparation fond:', stderr)
            return reject(err)
          }
          resolve()
        })
      })
      
      // Génération de la vidéo avec défilement
      const fps = 25
      const scrollDuration = Math.max(8, fresqueWidth / 250)
      
      // Commande simplifiée : utiliser les dimensions réelles de la fresque
      const scrollCmd = `ffmpeg -y -loop 1 -i "${bgResized}" -loop 1 -i "${inputTransparentFresque}" `
        + `-filter_complex "[1:v]crop=${IMAGE_WIDTH}:${fresqueHeight}:if(gte(n\\,0)\\,max(${fresqueWidth}-${IMAGE_WIDTH}-(((${fresqueWidth}-${IMAGE_WIDTH})/(${scrollDuration}*${fps}))*n)\\,0)\\,0):0,format=rgba[fg]; `
        + `[0:v][fg]overlay=format=auto,fps=${fps}[v]" `
        + `-map "[v]" -t ${scrollDuration} -c:v libx264 -pix_fmt yuv420p -preset fast "${outputVideoPath}"`
      
      console.log('▶️ Génération vidéo scrollée:', scrollCmd)
      
      await new Promise<void>((resolve, reject) => {
        exec(scrollCmd, (err, stdout, stderr) => {
          if (err) {
            console.error('❌ Erreur génération vidéo:', stderr)
            return reject(err)
          }
          resolve()
        })
      })
      
      // Nettoyage
      fs.unlinkSync(bgResized)
      
      return NextResponse.json({
        message: '✅ Vidéo avec défilement générée',
        video: `/fresque/${outputVideoFile}`
      })
    }
    
    else {
      return NextResponse.json({ 
        error: 'Paramètres invalides ou manquants pour cette étape' 
      }, { status: 400 })
    }

  } catch (err) {
    console.error('❌ Erreur serveur photos-animate:', err)
    return NextResponse.json({ error: 'Erreur serveur: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
