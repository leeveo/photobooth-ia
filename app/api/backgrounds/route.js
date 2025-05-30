import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    // Get the absolute path to the public/fond directory
    const fondDirPath = path.join(process.cwd(), 'public', 'fond');
    
    // Check if directory exists
    if (!fs.existsSync(fondDirPath)) {
      return NextResponse.json({ 
        error: 'Folder not found', 
        message: 'The backgrounds folder does not exist' 
      }, { status: 404 });
    }
    
    // Read the directory
    const files = fs.readdirSync(fondDirPath);
    
    // Filter for image files only and specifically for background- prefix
    const backgroundFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return (
          file.startsWith('background-') && 
          ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
        );
      })
      .map(file => {
        // Extract a friendly name from the filename 
        // (remove "background-" prefix and extension)
        const nameWithoutPrefix = file.replace('background-', '');
        const name = path.parse(nameWithoutPrefix).name;
        // Format the name: capitalize and replace hyphens with spaces
        const formattedName = 'Fond ' + 
          name.charAt(0).toUpperCase() + 
          name.slice(1).replace(/-/g, ' ');
          
        return {
          id: path.parse(file).name,
          name: formattedName,
          path: `/fond/${file}`
        };
      });
    
    return NextResponse.json({ backgrounds: backgroundFiles });
  } catch (error) {
    console.error('Error reading backgrounds directory:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      message: error.message 
    }, { status: 500 });
  }
}
