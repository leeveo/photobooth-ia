import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'

export async function POST(req: Request) {
  try {
    const { images } = await req.json()

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Aucune image sélectionnée' }, { status: 400 })
    }

    const publicDir = path.join(process.cwd(), 'public')
    const outputDir = path.join(publicDir, 'fresque')
    const outputImage = path.join(outputDir, 'fresque.png')
    const outputVideo = path.join(outputDir, 'fresque.webm')

    const inputFiles = images.map((imgPath) => path.join(publicDir, imgPath))

    for (const file of inputFiles) {
      if (!fs.existsSync(file)) {
        return NextResponse.json({ error: `Image introuvable: ${file}` }, { status: 400 })
      }
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Générer fresque.png
    const inputArgs = inputFiles.map((f) => `-i "${f}"`).join(' ')
    const filterChains = inputFiles
      .map((_, i) => `[${i}:v]scale=-1:480:force_original_aspect_ratio=decrease[img${i}]`)
      .join(';')

    const overlayLabels = inputFiles.map((_, i) => `[img${i}]`).join('')
    const totalInputs = inputFiles.length

    const ffmpegImageCmd = `ffmpeg ${inputArgs} -filter_complex "${filterChains};${overlayLabels}hstack=inputs=${totalInputs}[out]" -map "[out]" -frames:v 1 -y "${outputImage}"`

    console.log('🖼️ Génération PNG:', ffmpegImageCmd)

    await new Promise<void>((resolve, reject) => {
      exec(ffmpegImageCmd, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ PNG FFmpeg error:', stderr)
          return reject(err)
        }
        resolve()
      })
    })

    // ✅ Générer fresque.webm avec scroll horizontal
    const ffmpegVideoCmd = `ffmpeg -loop 1 -i "${outputImage}" -filter_complex "[0:v]scale=-1:480,format=yuv420p,zoompan=z='1':x='if(lte(on,30),0,on*5)':y=0:d=150" -t 10 -r 30 -c:v libvpx-vp9 -y "${outputVideo}"`

    console.log('🎞️ Génération WEBM animée:', ffmpegVideoCmd)

    await new Promise<void>((resolve, reject) => {
      exec(ffmpegVideoCmd, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ WEBM FFmpeg error:', stderr)
          return reject(err)
        }
        resolve()
      })
    })

    return NextResponse.json({
      message: '✅ Fresque PNG + vidéo WEBM animée générées',
      image: '/fresque/fresque.png',
      video: '/fresque/fresque.webm',
    })
  } catch (err) {
    console.error('❌ Erreur serveur photos-animate:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
