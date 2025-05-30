import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request) {
  console.log('Image watermark API called');
  try {
    const { imageUrl, projectId } = await request.json();
    
    if (!imageUrl || !projectId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Image URL and Project ID are required'
      }, { status: 400 });
    }
    
    console.log(`Processing watermark for project ${projectId}`);
    
    // Initialize Supabase client
    const supabase = createClientComponentClient();
    
    // Get project watermark settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('watermark_enabled, watermark_text, watermark_logo_url, watermark_position, watermark_text_position, watermark_text_color, watermark_text_size, watermark_opacity')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ 
        success: false, 
        message: `Error fetching project: ${projectError.message}`,
        watermarked: false 
      }, { status: 500 });
    }
    
    // Check if watermarking is enabled
    if (!project || !project.watermark_enabled) {
      console.log('Watermark not enabled for this project');
      return NextResponse.json({ 
        success: true, 
        watermarked: false, 
        url: imageUrl,
        message: 'Watermark not enabled for this project' 
      });
    }
    
    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      return NextResponse.json({ 
        success: false, 
        message: `Failed to fetch image: ${imageResponse.statusText}`,
        watermarked: false 
      }, { status: 500 });
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Process the image with Sharp
    let sharpImage = sharp(Buffer.from(imageBuffer));
    const metadata = await sharpImage.metadata();
    const { width, height } = metadata;
    
    // Track what watermarks were applied
    let textApplied = false;
    let logoApplied = false;
    
    // Array to hold composite operations
    const compositeOperations = [];
    
    // Add text watermark if specified
    if (project.watermark_text) {
      const fontSize = parseInt(project.watermark_text_size) || 24;
      const textColor = project.watermark_text_color || '#FFFFFF';
      const opacity = parseFloat(project.watermark_opacity) || 0.8;
      
      // Create SVG for text watermark
      const svgText = Buffer.from(`
      <svg width="${width}" height="${height}">
        <text 
          x="${getTextPositionX(project.watermark_text_position, width)}" 
          y="${getTextPositionY(project.watermark_text_position, height)}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
          text-anchor="${getTextAnchor(project.watermark_text_position)}"
          fill="${textColor}"
          fill-opacity="${opacity}"
        >${project.watermark_text}</text>
      </svg>
      `);
      
      compositeOperations.push({
        input: svgText,
        gravity: 'northwest'
      });
      
      textApplied = true;
      console.log(`Added text watermark: "${project.watermark_text}"`);
    }
    
    // Add logo watermark if specified
    if (project.watermark_logo_url) {
      try {
        const logoResponse = await fetch(project.watermark_logo_url);
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          
          // Resize logo to appropriate size (15% of image width)
          const logoWidth = Math.round(width * 0.15);
          const resizedLogo = await sharp(Buffer.from(logoBuffer))
            .resize({ width: logoWidth })
            .toBuffer();
          
          // Get dimensions of resized logo
          const logoMetadata = await sharp(resizedLogo).metadata();
          const logoHeight = logoMetadata.height;
          
          // Position logo based on watermark_position
          const position = getLogoPosition(project.watermark_position, width, height, logoWidth, logoHeight);
          
          compositeOperations.push({
            input: resizedLogo,
            top: position.y,
            left: position.x
          });
          
          logoApplied = true;
          console.log(`Added logo watermark at position: ${project.watermark_position}`);
        } else {
          console.error(`Failed to fetch logo: ${logoResponse.status} ${logoResponse.statusText}`);
        }
      } catch (logoError) {
        console.error('Error processing logo:', logoError);
      }
    }
    
    // Apply watermarks to the image
    if (compositeOperations.length > 0) {
      sharpImage = sharpImage.composite(compositeOperations);
      console.log(`Applied ${compositeOperations.length} watermark elements`);
    } else {
      console.log('No watermarks to apply');
      return NextResponse.json({
        success: true,
        watermarked: false,
        url: imageUrl,
        message: 'No valid watermarks configured'
      });
    }
    
    // Output the watermarked image as JPEG
    const watermarkedBuffer = await sharpImage
      .jpeg({ quality: 95 })
      .toBuffer();
      
    console.log(`Generated watermarked image: ${watermarkedBuffer.length} bytes`);
    
    // Upload watermarked image to storage
    const fileName = `watermarked/${projectId}/${Date.now()}.jpg`;
    
    try {
      // Create bucket if it doesn't exist
      try {
        await supabase.storage.createBucket('watermarked-images', { public: true });
      } catch (bucketError) {
        console.log("Note on bucket creation:", bucketError?.message || bucketError);
      }
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('watermarked-images')
        .upload(fileName, watermarkedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading watermarked image:', uploadError);
        return NextResponse.json({ 
          success: false, 
          message: `Error uploading watermarked image: ${uploadError.message}`,
          watermarked: false 
        }, { status: 500 });
      }
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('watermarked-images')
        .getPublicUrl(fileName);
      
      const watermarkedUrl = urlData.publicUrl;
      console.log(`Watermarked image URL: ${watermarkedUrl}`);
      
      return NextResponse.json({
        success: true,
        watermarked: true,
        textApplied,
        logoApplied,
        url: watermarkedUrl,
        originalUrl: imageUrl
      });
      
    } catch (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ 
        success: false, 
        message: `Storage error: ${storageError.message}`,
        watermarked: false 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in watermark process:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Server error: ${error.message}`,
      watermarked: false 
    }, { status: 500 });
  }
}

// Helper functions
function getTextAnchor(position) {
  if (position === 'top-right' || position === 'bottom-right') {
    return 'end';
  } else if (position === 'top-left' || position === 'bottom-left') {
    return 'start';
  } else {
    return 'middle';
  }
}

function getTextPositionX(position, width) {
  const padding = 20;
  if (position === 'top-right' || position === 'bottom-right') {
    return width - padding;
  } else if (position === 'top-left' || position === 'bottom-left') {
    return padding;
  } else {
    return width / 2;
  }
}

function getTextPositionY(position, height) {
  const padding = 20;
  if (position === 'top-right' || position === 'top-left') {
    return padding + 30; // Add some space for the font height
  } else if (position === 'bottom-right' || position === 'bottom-left') {
    return height - padding;
  } else {
    return height / 2;
  }
}

function getLogoPosition(position, width, height, logoWidth, logoHeight) {
  const padding = 20;
  switch (position) {
    case 'top-left':
      return { x: padding, y: padding };
    case 'top-right':
      return { x: width - logoWidth - padding, y: padding };
    case 'bottom-left':
      return { x: padding, y: height - logoHeight - padding };
    case 'bottom-right':
      return { x: width - logoWidth - padding, y: height - logoHeight - padding };
    case 'center':
      return { x: (width - logoWidth) / 2, y: (height - logoHeight) / 2 };
    default:
      return { x: width - logoWidth - padding, y: height - logoHeight - padding };
  }
}
