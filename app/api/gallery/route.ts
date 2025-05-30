import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const files = await readdir(uploadsDir);
    const videos = files.filter((f) => f.startsWith('bg_removed_') && f.endsWith('.mp4'));
    return NextResponse.json({ videos });
  } catch (err: any) {
    console.error('❌ Erreur lecture fichiers:', err);
    return NextResponse.json({ videos: [] });
  }
}
