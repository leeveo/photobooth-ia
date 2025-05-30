import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'

export async function GET() {
  try {
    const photoDir = path.join(process.cwd(), 'public', 'background_removed_photos')
    const outputPath = path.join(process.cwd(), 'public', 'uploads', 'photo_wall_static.mp4')

    const files = fs
      .readdirSync(photoDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .sort()
      .map(f => path.join(photoDir, f))

    if (files.length < 2) {
      return NextResponse.json({ error: 'Il faut au moins 2 photos' }, { status: 400 })
    }

    // Créer une liste temporaire pour concat
    const inputListPath = path.join(photoDir, 'input.txt')
    const frameImages = files.map((f, i) => {
      const framePath = path.join(photoDir, `frame_${i}.png`)
      fs.copyFileSync(f, framePath)
      return `file '${framePath.replace(/\\/g, '/')}'\nduration 2`
    })

    fs.writeFileSync(inputListPath, frameImages.join('\n'))

    const cmd = `ffmpeg -y -f concat -safe 0 -i "${inputListPath}" -vf "scale=320:240,tile=1x1" -vsync vfr -pix_fmt yuv420p "${outputPath}"`

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(stderr)
          reject(err)
        } else {
          resolve()
        }
      })
    })

    return NextResponse.json({ message: '✅ Fresque photo générée', video: '/uploads/photo_wall_static.mp4' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur génération fresque' }, { status: 500 })
  }
}
