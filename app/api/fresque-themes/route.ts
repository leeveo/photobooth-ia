import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const fresqueDir = path.join(process.cwd(), 'public', 'fresque')

  try {
    const files = fs.readdirSync(fresqueDir)
    const themes = files
      .filter((name) => /^bg-.*\.(jpg|png)$/i.test(name)) // insensible à la casse
      .map((filename) => {
        const label = filename
          .replace(/^bg-/, '')
          .replace(/\.(jpg|png)$/i, '')
        return { label, file: filename }
      })

    return NextResponse.json({ themes })
  } catch (err) {
    console.error('❌ Erreur lecture fonds :', err)
    return NextResponse.json({ error: 'Erreur lecture fonds' }, { status: 500 })
  }
}
