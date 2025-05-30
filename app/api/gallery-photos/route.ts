import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const photosDir = path.join(process.cwd(), 'public', 'photos')
  const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
  return NextResponse.json({ photos: files })
}
