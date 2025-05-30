import { NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function middleware(request) {
  // Create required directories if they don't exist
  const dirs = [
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'public', 'background_removed_photos')
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      try {
        await mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (err) {
        console.error(`Error creating directory ${dir}:`, err);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
