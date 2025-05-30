import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API /api/merge-videos called');

  const ffmpegPath = require('ffmpeg-static');
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegPath as string)
  ffmpeg.setFfprobePath(ffprobePath)

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const outputPath = path.join(uploadsDir, 'merged_static.mp4')

    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.startsWith('bg_removed_video') && file.endsWith('.mp4'))
      .sort()
      .map(file => path.join(uploadsDir, file))

    if (files.length < 2) {
      return res.status(400).json({ error: 'Il faut au moins 2 vidéos bg_removed_video*.mp4' })
    }

    const inputArgs = files.map(file => `-i "${file}"`).join(' ')
    const scaleFilters = files.map((_, i) => `[${i}:v]scale=640:480[v${i}]`).join('; ')
    const delayFilters = files.map((_, i) => {
      let delay = 0
      if (i === 1) delay = 0.3
      else if (i > 1) delay = 0.3 + (i - 1) * 0.8
      return `[v${i}]tpad=start_duration=${delay}[vd${i}]`
    }).join('; ')
    const hstackInputs = files.map((_, i) => `[vd${i}]`).join('')
    const totalInputs = files.length
    const filter = `
      ${scaleFilters};
      ${delayFilters};
      ${hstackInputs}hstack=inputs=${totalInputs}[video]
    `.replace(/\s+/g, ' ').trim()

    const cmd = `ffmpeg ${inputArgs} -filter_complex "${filter}" -map "[video]" -preset veryfast -y "${outputPath}"`
    console.log('▶️ FFmpeg CMD:', cmd)

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

    return res.status(200).json({
      message: `✅ Vidéo horizontale générée avec décalage ajusté`,
      video: '/uploads/merged_static.mp4'
    })
  } catch (error) {
    console.error('❌ Erreur de fusion:', error)
    return res.status(500).json({ error: 'Erreur interne de fusion' })
  }
}
