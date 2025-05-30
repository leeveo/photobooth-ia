import { NextResponse } from 'next/server'
import path from 'path'
import { exec } from 'child_process'

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const inputVideo = path.join(uploadsDir, 'merged_static.mp4')
    const background = path.join(uploadsDir, 'bg.jpg') // ton image de fond
    const outputVideo = path.join(uploadsDir, 'merged_with_bg.mp4')

    const cmd = `ffmpeg -i "${background}" -i "${inputVideo}" -filter_complex `
      + `"[1:v]colorkey=black:0.005:0.1[fg];[0:v][fg]overlay=format=auto" `
      + `-preset veryfast -y "${outputVideo}"`

    console.log('▶️ FFmpeg BG CMD:', cmd)

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ FFmpeg ERROR:', stderr)
          reject(err)
        } else {
          resolve()
        }
      })
    })

    return NextResponse.json({ message: '✅ Background ajouté avec succès', video: '/uploads/merged_with_bg.mp4' })

  } catch (err) {
    console.error('❌ Erreur background:', err)
    return NextResponse.json({ error: 'Erreur ajout background' }, { status: 500 })
  }
}
