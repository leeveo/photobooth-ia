import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('video') as File;

  if (!file) {
    console.error('❌ Aucun fichier reçu');
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // On génère ici un nom horodaté unique
  const timestamp = Date.now();
  const filename = `video_${timestamp}.webm`;

  console.log('📁 Fichier reçu :', filename);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  // Convert Buffer to Uint8Array for writeFile compatibility
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  await writeFile(filePath, uint8Array);

  console.log('✅ Vidéo enregistrée :', filePath);

  return NextResponse.json({
    message: 'Upload OK',
    filename,
    path: `/uploads/${filename}`,
  });
}
