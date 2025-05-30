import { NextResponse } from 'next/server';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

// Export the route handler function
export async function POST(req) {
  try {
    // Before accessing the directory, verify it exists and create if needed
    const backgroundRemovedDir = path.join(process.cwd(), 'public', 'background_removed_photos');
    if (!existsSync(backgroundRemovedDir)) {
      try {
        mkdirSync(backgroundRemovedDir, { recursive: true });
        console.log(`Created directory: ${backgroundRemovedDir}`);
      } catch (err) {
        console.error(`Error creating directory: ${err}`);
        // Return error response inside the function
        return NextResponse.json({ error: 'Directory access error' }, { status: 500 });
      }
    }

    // Continue with your existing implementation
    // ...existing code...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in photos-wall/merge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}