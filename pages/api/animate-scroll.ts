import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API /api/animate-scroll called');
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    // Utilise la vidéo générée par add-background comme source
    const inputVideo = path.join(uploadsDir, 'merged_with_bg.mp4')
    const outputVideo = path.join(uploadsDir, 'scroll_video.mp4')

    if (!fs.existsSync(inputVideo)) {
      console.error('❌ Vidéo non trouvée:', inputVideo)
      return res.status(404).json({
        error: 'Aucune vidéo générée avec fond trouvée. Lancez d\'abord l\'ajout du fond.'
      })
    }

    // Récupère la largeur et la hauteur de la vidéo d'entrée
    const getVideoInfo = () =>
      new Promise<{ width: number, height: number }>((resolve, reject) => {
        exec(
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "${inputVideo}"`,
          (err, stdout) => {
            if (err) return reject(err)
            const [width, height] = stdout.trim().split('x').map(Number)
            resolve({ width, height })
          }
        )
      })

    let { width: inputWidth, height: inputHeight } = await getVideoInfo()
    console.log('Dimensions vidéo d\'entrée:', inputWidth, inputHeight)

    const cropWidth = 640
    const cropHeight = 480

    // Si la vidéo n'est pas au bon format, on la scale d'abord
    let tempInput = inputVideo
    let needScale = false
    if (inputHeight !== cropHeight) {
      needScale = true
      tempInput = path.join(uploadsDir, 'tmp_scaled_input.mp4')
      const scaleCmd = `ffmpeg -y -i "${inputVideo}" -vf "scale=-2:${cropHeight}" -preset veryfast "${tempInput}"`
      console.log('▶️ FFmpeg scale CMD:', scaleCmd)
      await new Promise<void>((resolve, reject) => {
        exec(scaleCmd, (err, stdout, stderr) => {
          if (err) {
            console.error('❌ FFmpeg SCALE ERROR:', stderr)
            return reject(err)
          }
          resolve()
        })
      })
      // Récupère la nouvelle largeur après scale
      const getScaledInfo = () =>
        new Promise<{ width: number, height: number }>((resolve, reject) => {
          exec(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "${tempInput}"`,
            (err, stdout) => {
              if (err) return reject(err)
              const [width, height] = stdout.trim().split('x').map(Number)
              resolve({ width, height })
            }
          )
        })
      const { width: scaledWidth } = await getScaledInfo()
      console.log('Nouvelle largeur après scale:', scaledWidth)
      inputWidth = scaledWidth
    }

    if (inputWidth <= cropWidth) {
      fs.copyFileSync(tempInput, outputVideo)
      if (needScale) fs.unlinkSync(tempInput)
      console.log('Vidéo copiée sans scroll (largeur <= 640)')
    } else {
      // Ralentir le scroll : augmente la durée (ex : 16 secondes) et adapte le calcul du scroll
      const duration = 16 // durée de la vidéo de sortie en secondes (plus grand = plus lent)
      const fps = 25
      const scrollFilter = `crop=${cropWidth}:${cropHeight}:if(gte(n\\,0)\\,min(((${inputWidth}-${cropWidth})/(${duration}*${fps}))*n\\,${inputWidth}-${cropWidth})\\,0):0`
      const ffmpegCmd = `ffmpeg -y -i "${tempInput}" -filter_complex "[0:v]${scrollFilter},fps=${fps},format=yuv420p[v]" -map "[v]" -map 0:a? -t ${duration} -preset veryfast "${outputVideo}"`
      console.log('▶️ FFmpeg scroll CMD:', ffmpegCmd)
      await new Promise<void>((resolve, reject) => {
        exec(ffmpegCmd, (err, stdout, stderr) => {
          if (err) {
            console.error('❌ FFmpeg ERROR:', stderr)
            return reject(stderr)
          }
          resolve()
        })
      })
      if (needScale) fs.unlinkSync(tempInput)
    }

    return res.status(200).json({
      video: '/uploads/scroll_video.mp4',
      message: '✅ Scroll vidéo généré (défilement horizontal)'
    })
  } catch (err) {
    console.error('❌ Erreur génération scroll:', err)
    return res.status(500).json({ error: 'Erreur génération scroll: ' + err })
  }
}
