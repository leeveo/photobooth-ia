import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic' // Don't cache this API route

export async function GET(req: Request) {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    
    // Get all files in the uploads directory
    const files = fs.readdirSync(uploadsDir)
    
    // Only include image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    const photos = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase()
        return imageExtensions.includes(ext)
      })
      .map(file => `/uploads/${file}`)
    
    console.log(`📸 Found ${photos.length} photos in gallery`)
    
    return NextResponse.json({
      photos
    })
  } catch (err) {
    console.error('❌ Error in photo-gallery API:', err)
    return NextResponse.json({ error: 'Error fetching photos', photos: [] }, { status: 500 })
  }
}
