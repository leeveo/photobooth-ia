import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { writeFile } from 'fs/promises'

export async function POST(req: Request) {
  console.log('📤 API telechargement-image: Début du traitement')
  
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
  
    if (!files.length) {
      console.log('❌ Aucun fichier reçu')
      return NextResponse.json({ 
        error: 'Aucun fichier reçu',
        uploaded: [] 
      }, { status: 400 })
    }
  
    console.log(`📦 ${files.length} fichier(s) reçu(s)`)
    
    // Change the directory to /uploads instead of /photos to match the remove-bg API
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
  
    const uploadedFiles = []
    
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Get correct extension based on mime type
      const ext = file.type.split('/')[1] || 'jpg'
      const originalFilename = file.name || `image-${Date.now()}.${ext}`
      const filename = `${originalFilename.split('.')[0]}-${uuidv4().substring(0, 8)}.${ext}`
      
      const filepath = path.join(uploadsDir, filename)
      // Convert Buffer to Uint8Array for writeFile compatibility
      const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      await writeFile(filepath, uint8Array)
      
      console.log(`✅ Fichier enregistré: ${filename}`)
      uploadedFiles.push(`/uploads/${filename}`)
    }
  
    console.log(`✅ ${uploadedFiles.length} fichier(s) téléchargé(s) avec succès:`, uploadedFiles)
    
    return NextResponse.json({ 
      message: '✅ Upload terminé',
      uploaded: uploadedFiles
    })
  } catch (err) {
    console.error('❌ Erreur serveur telechargement-image:', err)
    return NextResponse.json({ 
      error: 'Erreur serveur: ' + (err instanceof Error ? err.message : String(err)),
      uploaded: [] 
    }, { status: 500 })
  }
}
