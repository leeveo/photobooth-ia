import { existsSync, mkdirSync } from 'fs';
import path from 'path';

// Avant d'utiliser le répertoire, vérifiez s'il existe et créez-le si nécessaire
const backgroundRemovedDir = path.join(process.cwd(), 'public', 'background_removed_photos');
if (!existsSync(backgroundRemovedDir)) {
  try {
    mkdirSync(backgroundRemovedDir, { recursive: true });
    console.log(`Created directory: ${backgroundRemovedDir}`);
  } catch (err) {
    console.error(`Error creating directory: ${err}`);
    // Continue with a fallback approach
    return NextResponse.json({ error: 'Directory access error' }, { status: 500 });
  }
}