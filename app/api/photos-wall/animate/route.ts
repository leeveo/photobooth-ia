import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const input = path.join(uploadsDir, 'photo_wall_static.mp4')
    const output = path.join(uploadsDir, 'photo_wall_animated.mp4')

    if (!fs.existsSync(input)) {
      return NextResponse.json({ error: 'photo_wall_static.mp4 introuvable' }, { status: 404 })
    }

    const width = 640
    const scrollSpeed = 96 // px/s
    const totalScroll = 2560 - width
    const duration = Math.ceil(totalScroll / scrollSpeed)

    const cmd = `ffmpeg -i "${input}" -vf "crop=${width}:480:if(gte(t\\,0)\\,0 + t*${scrollSpeed}\\,0):0,scale=${width}:480" -t ${duration} -preset veryfast -y "${output}"`

    console.log('FFmpeg animate CMD:', cmd)

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

    return NextResponse.json({ message: '✅ Scroll horizontal généré', video: '/uploads/photo_wall_animated.mp4' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur scroll photo wall' }, { status: 500 })
  }
}
