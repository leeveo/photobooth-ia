import { NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function middleware(request) {
  try {
    // Créer des répertoires essentiels au démarrage
    const dirs = [
      'public/uploads',
      'public/background_removed_photos'
    ];

    for (const dir of dirs) {
      try {
        // Utiliser path.join et process.cwd() uniquement en développement
        if (process.env.NODE_ENV !== 'production') {
          const fullPath = path.join(process.cwd(), dir);
          if (!existsSync(fullPath)) {
            await mkdir(fullPath, { recursive: true });
            console.log(`Répertoire créé: ${dir}`);
          }
        }
      } catch (err) {
        console.error(`Erreur lors de la création du répertoire ${dir}:`, err);
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
