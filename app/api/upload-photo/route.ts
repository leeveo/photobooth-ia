import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('📤 API upload-photo: Début du traitement')

  try {
    // Debug information to identify what's being received
    console.log("Content-Type:", req.headers.get("content-type"))
    
    const uploadedFiles = []
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    // Handle multipart form data
    const formData = await req.formData()
    console.log("Form data keys:", Array.from(formData.keys()))
    
    // Check if we have data in the 'photo' field
    if (formData.has('photo')) {
      const photoField = formData.get('photo')
      console.log("Photo field type:", typeof photoField)
      
      if (photoField && typeof photoField !== 'string') {
        // Handle the file from the form data
        const fileBuffer = Buffer.from(await photoField.arrayBuffer())
        const filename = `photo-${Date.now()}-${uuidv4().substring(0, 8)}.jpg`
        const filepath = path.join(uploadsDir, filename)
        
        // Convert Buffer to Uint8Array for writeFile compatibility
        const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
        await writeFile(filepath, uint8Array)
        console.log(`✅ Photo enregistrée: ${filename}`)
        uploadedFiles.push(`/uploads/${filename}`)
      } else {
        console.log('❌ Field "photo" exists but is not a file')
      }
    } else {
      // Try other possible field names
      const possibleFieldNames = ['files', 'file', 'images', 'image', 'upload']
      let foundFile = false
      
      for (const fieldName of possibleFieldNames) {
        if (formData.has(fieldName)) {
          const fieldValue = formData.get(fieldName)
          console.log(`Found field '${fieldName}', type: ${typeof fieldValue}`)
          
          if (fieldValue && typeof fieldValue !== 'string') {
            const fileBuffer = Buffer.from(await fieldValue.arrayBuffer())
            const contentType = fieldValue.type || 'image/jpeg'
            const ext = contentType.split('/')[1] || 'jpg'
            const filename = `upload-${Date.now()}-${uuidv4().substring(0, 8)}.${ext}`
            const filepath = path.join(uploadsDir, filename)
            
            // Convert Buffer to Uint8Array for writeFile compatibility
            const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
            await writeFile(filepath, uint8Array)
            console.log(`✅ Fichier enregistré: ${filename}`)
            uploadedFiles.push(`/uploads/${filename}`)
            foundFile = true
            break
          }
        }
      }
      
      if (!foundFile) {
        console.log('❌ No valid file field found in form data')
        return NextResponse.json({ 
          error: 'Aucun fichier reçu',
          uploaded: [] 
        }, { status: 400 })
      }
    }
  
    console.log(`✅ ${uploadedFiles.length} fichier(s) téléchargé(s) avec succès:`, uploadedFiles)
    
    return NextResponse.json({ 
      message: '✅ Upload terminé',
      uploaded: uploadedFiles
    })
  } catch (err) {
    console.error('❌ Erreur serveur upload-photo:', err)
    return NextResponse.json({ 
      error: 'Erreur serveur: ' + (err instanceof Error ? err.message : String(err)),
      uploaded: [] 
    }, { status: 500 })
  }
}
