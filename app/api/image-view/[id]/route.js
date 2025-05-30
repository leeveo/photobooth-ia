import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import sharp from 'sharp'; // Make sure this import is present

// Initialize Supabase with admin privileges to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const imageId = params.id;
  
  try {
    if (!imageId) {
      return new Response('Image ID is required', { status: 400 });
    }
    
    console.log(`Serving image with ID: ${imageId}`);
    
    // Get image record from database with admin privileges
    const { data: imageData, error: imageError } = await supabase
      .from('project_images')
      .select('image_url, project_id, metadata')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      console.error('Error fetching image data:', imageError);
      return new Response('Image not found', { status: 404 });
    }
    
    const { project_id, image_url } = imageData;
    
    // Get project watermark settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('watermark_enabled, watermark_text, watermark_logo_url, watermark_position, watermark_text_position, watermark_text_color, watermark_text_size, watermark_opacity')
      .eq('id', project_id)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      // If we can't get watermark settings, just redirect to the original image
      return NextResponse.redirect(image_url);
    }
    
    // If watermarking is disabled, redirect to original image
    if (!project || !project.watermark_enabled) {
      return NextResponse.redirect(image_url);
    }
    
    // Fetch the original image
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch original image: ${imageResponse.status}`);
      return NextResponse.redirect(image_url); // Fall back to original image
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Initialize Sharp with the image
    let sharpImage = sharp(Buffer.from(imageBuffer));
    const metadata = await sharpImage.metadata();
    const { width, height } = metadata;
    
    // List to hold composite operations
    const compositeOperations = [];
    
    // Add text watermark if specified
    if (project.watermark_text) {
      const fontSize = parseInt(project.watermark_text_size) || 24;
      const textColor = project.watermark_text_color || '#FFFFFF';
      const opacity = parseFloat(project.watermark_opacity) || 0.8;
      
      // Position the text based on watermark_text_position
      let textX, textY, textAnchor;
      
      if (project.watermark_text_position === 'top-left' || project.watermark_text_position === 'bottom-left') {
        textAnchor = 'start';
        textX = 20;
      } else if (project.watermark_text_position === 'top-right' || project.watermark_text_position === 'bottom-right') {
        textAnchor = 'end';
        textX = width - 20;
      } else { // center
        textAnchor = 'middle';
        textX = width / 2;
      }
      
      if (project.watermark_text_position === 'top-left' || project.watermark_text_position === 'top-right') {
        textY = fontSize + 20;
      } else if (project.watermark_text_position === 'bottom-left' || project.watermark_text_position === 'bottom-right') {
        textY = height - 20;
      } else { // center
        textY = height / 2;
      }
      
      // Create SVG for text watermark
      const svgText = Buffer.from(`
        <svg width="${width}" height="${height}">
          <text 
            x="${textX}" 
            y="${textY}"
            font-family="Arial, sans-serif"
            font-size="${fontSize}px"
            font-weight="bold"
            text-anchor="${textAnchor}"
            fill="${textColor}"
            fill-opacity="${opacity}"
          >${project.watermark_text}</text>
        </svg>
      `);
      
      compositeOperations.push({
        input: svgText,
        gravity: 'northwest'
      });
      
      console.log(`Applied text watermark: "${project.watermark_text}"`);
    }
    
    // Add logo watermark if specified
    if (project.watermark_logo_url) {
      try {
        const logoResponse = await fetch(project.watermark_logo_url);
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          const logoSharp = sharp(Buffer.from(logoBuffer));
          
          // Resize logo to appropriate size (15% of image width)
          const logoWidth = Math.round(width * 0.15);
          const resizedLogo = await logoSharp.resize({ width: logoWidth }).toBuffer();
          
          // Get dimensions of resized logo
          const logoMetadata = await sharp(resizedLogo).metadata();
          const logoHeight = logoMetadata.height;
          
          // Position logo based on watermark_position
          let logoX, logoY;
          const padding = 20;
          
          if (project.watermark_position === 'top-left') {
            logoX = padding;
            logoY = padding;
          } else if (project.watermark_position === 'top-right') {
            logoX = width - logoWidth - padding;
            logoY = padding;
          } else if (project.watermark_position === 'bottom-left') {
            logoX = padding;
            logoY = height - logoHeight - padding;
          } else if (project.watermark_position === 'bottom-right') {
            logoX = width - logoWidth - padding;
            logoY = height - logoHeight - padding;
          } else { // center
            logoX = (width - logoWidth) / 2;
            logoY = (height - logoHeight) / 2;
          }
          
          compositeOperations.push({
            input: resizedLogo,
            left: logoX,
            top: logoY
          });
          
          console.log(`Applied logo watermark at ${project.watermark_position}`);
        } else {
          console.error(`Failed to fetch logo: ${logoResponse.status}`);
        }
      } catch (logoError) {
        console.error('Error processing watermark logo:', logoError);
      }
    }
    
    // Apply watermarks if any were prepared
    if (compositeOperations.length > 0) {
      sharpImage = sharpImage.composite(compositeOperations);
    } else {
      // No watermarks to apply, redirect to original
      return NextResponse.redirect(image_url);
    }
    
    // Process the image and convert to buffer
    const watermarkedBuffer = await sharpImage.jpeg({ quality: 90 }).toBuffer();
    
    // Return the watermarked image with appropriate headers
    return new Response(watermarkedBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for a year
        'Content-Disposition': 'inline; filename="watermarked-image.jpg"'
      }
    });
    
  } catch (error) {
    console.error('Error serving watermarked image:', error);
    // If anything goes wrong, try to get the original URL from DB
    if (imageId) {
      try {
        const { data } = await supabase
          .from('project_images')
          .select('image_url')
          .eq('id', imageId)
          .single();
        
        if (data?.image_url) {
          return NextResponse.redirect(data.image_url);
        }
      } catch (dbError) {
        console.error('Error getting fallback URL:', dbError);
      }
    }
    
    return new Response('Error processing watermarked image', { status: 500 });
  }
}
