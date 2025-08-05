import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  try {
    // Get form data from the request
    const formData = await request.formData();
    const projectId = formData.get('projectId');
    const name = formData.get('name');
    const file = formData.get('file');
    const fileVertical = formData.get('fileVertical');
    const videoFile = formData.get('videoFile');
    const videoFileVertical = formData.get('videoFileVertical');
    
    // Get template URLs if no files are provided
    const templateImageUrl = formData.get('templateImageUrl');
    const templateImageVerticalUrl = formData.get('templateImageVerticalUrl');
    const templateVideoUrl = formData.get('templateVideoUrl');
    const templateVideoVerticalUrl = formData.get('templateVideoVerticalUrl');
    
    const hasFiles = file || fileVertical || videoFile || videoFileVertical;
    const hasTemplateUrls = templateImageUrl || templateImageVerticalUrl || templateVideoUrl || templateVideoVerticalUrl;
    
    if (!projectId || !name || (!hasFiles && !hasTemplateUrls)) {
      return NextResponse.json({
        success: false,
        error: 'Project ID, name and at least one file or template URL are required'
      }, { status: 400 });
    }
    
    console.log('Processing background for project', projectId, {
      hasHorizontalImage: !!file,
      hasVerticalImage: !!fileVertical,
      hasHorizontalVideo: !!videoFile,
      hasVerticalVideo: !!videoFileVertical,
      hasTemplateImageUrl: !!templateImageUrl,
      hasTemplateImageVerticalUrl: !!templateImageVerticalUrl,
      hasTemplateVideoUrl: !!templateVideoUrl,
      hasTemplateVideoVerticalUrl: !!templateVideoVerticalUrl
    });
    
    // First delete existing backgrounds for this project
    try {
      const { error: deleteError } = await supabaseAdmin
        .from('backgrounds')
        .delete()
        .eq('project_id', projectId)
        .eq('is_active', true);
        
      if (deleteError) {
        console.error('Error deleting backgrounds:', deleteError);
        throw new Error(`Error deleting existing backgrounds: ${deleteError.message}`);
      } else {
        console.log('Successfully deleted existing backgrounds');
      }
    } catch (error) {
      console.error('Error handling existing backgrounds:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Error handling existing backgrounds'
      }, { status: 500 });
    }
    
    // Get project slug from projectId
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('slug')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({
        success: false,
        error: `Error fetching project: ${projectError.message}`
      }, { status: 500 });
    }
    
    const projectSlug = projectData.slug;
    const timestamp = Date.now();
    
    let imageUrl = null;
    let imageUrlVertical = null;
    let videoUrl = null;
    let videoUrlVertical = null;
    let storagePathHorizontal = null;
    let storagePathVertical = null;
    let storagePathVideoHorizontal = null;
    let storagePathVideoVertical = null;
    
    // Upload horizontal image if provided
    if (file) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${projectSlug}/backgrounds/${timestamp}_horizontal.${fileExt}`;
      
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('backgrounds')
        .upload(filePath, fileBuffer, { 
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Upload error (horizontal):', uploadError);
        return NextResponse.json({
          success: false,
          error: `Upload error (horizontal): ${uploadError.message}`
        }, { status: 500 });
      }
      
      const { data: urlData } = supabaseAdmin.storage
        .from('backgrounds')
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get public URL for horizontal image'
        }, { status: 500 });
      }
      
      imageUrl = urlData.publicUrl;
      storagePathHorizontal = filePath;
    }
    
    // Upload vertical image if provided
    if (fileVertical) {
      const fileExtVertical = fileVertical.name.split('.').pop();
      const filePathVertical = `${projectSlug}/backgrounds/${timestamp}_vertical.${fileExtVertical}`;
      
      const arrayBufferVertical = await fileVertical.arrayBuffer();
      const fileBufferVertical = new Uint8Array(arrayBufferVertical);
      
      const { data: uploadDataVertical, error: uploadErrorVertical } = await supabaseAdmin.storage
        .from('backgrounds')
        .upload(filePathVertical, fileBufferVertical, { 
          contentType: fileVertical.type,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadErrorVertical) {
        console.error('Upload error (vertical):', uploadErrorVertical);
        return NextResponse.json({
          success: false,
          error: `Upload error (vertical): ${uploadErrorVertical.message}`
        }, { status: 500 });
      }
      
      const { data: urlDataVertical } = supabaseAdmin.storage
        .from('backgrounds')
        .getPublicUrl(filePathVertical);
      
      if (!urlDataVertical || !urlDataVertical.publicUrl) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get public URL for vertical image'
        }, { status: 500 });
      }
      
      imageUrlVertical = urlDataVertical.publicUrl;
      storagePathVertical = filePathVertical;
    }
    
    // Upload horizontal video if provided
    if (videoFile) {
      const videoExtHorizontal = videoFile.name.split('.').pop();
      const videoPathHorizontal = `${projectSlug}/backgrounds/${timestamp}_video_horizontal.${videoExtHorizontal}`;
      
      const arrayBufferVideoHorizontal = await videoFile.arrayBuffer();
      const videoBufferHorizontal = new Uint8Array(arrayBufferVideoHorizontal);
      
      const { data: uploadVideoHorizontal, error: uploadVideoErrorHorizontal } = await supabaseAdmin.storage
        .from('backgrounds')
        .upload(videoPathHorizontal, videoBufferHorizontal, { 
          contentType: videoFile.type,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadVideoErrorHorizontal) {
        console.error('Upload error (horizontal video):', uploadVideoErrorHorizontal);
        return NextResponse.json({
          success: false,
          error: `Upload error (horizontal video): ${uploadVideoErrorHorizontal.message}`
        }, { status: 500 });
      }
      
      const { data: urlVideoHorizontal } = supabaseAdmin.storage
        .from('backgrounds')
        .getPublicUrl(videoPathHorizontal);
      
      if (!urlVideoHorizontal || !urlVideoHorizontal.publicUrl) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get public URL for horizontal video'
        }, { status: 500 });
      }
      
      videoUrl = urlVideoHorizontal.publicUrl;
      storagePathVideoHorizontal = videoPathHorizontal;
    }
    
    // Upload vertical video if provided
    if (videoFileVertical) {
      const videoExtVertical = videoFileVertical.name.split('.').pop();
      const videoPathVertical = `${projectSlug}/backgrounds/${timestamp}_video_vertical.${videoExtVertical}`;
      
      const arrayBufferVideoVertical = await videoFileVertical.arrayBuffer();
      const videoBufferVertical = new Uint8Array(arrayBufferVideoVertical);
      
      const { data: uploadVideoVertical, error: uploadVideoErrorVertical } = await supabaseAdmin.storage
        .from('backgrounds')
        .upload(videoPathVertical, videoBufferVertical, { 
          contentType: videoFileVertical.type,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadVideoErrorVertical) {
        console.error('Upload error (vertical video):', uploadVideoErrorVertical);
        return NextResponse.json({
          success: false,
          error: `Upload error (vertical video): ${uploadVideoErrorVertical.message}`
        }, { status: 500 });
      }
      
      const { data: urlVideoVertical } = supabaseAdmin.storage
        .from('backgrounds')
        .getPublicUrl(videoPathVertical);
      
      if (!urlVideoVertical || !urlVideoVertical.publicUrl) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get public URL for vertical video'
        }, { status: 500 });
      }
      
      videoUrlVertical = urlVideoVertical.publicUrl;
      storagePathVideoVertical = videoPathVertical;
    }
    
    // Insert background in database with both orientations
    const insertData = {
      name: name,
      project_id: projectId,
      is_active: true
    };
    
    // We need to ensure at least image_url has a value to satisfy NOT NULL constraint
    let hasImageUrl = false;
    let hasImageUrlVertical = false;
    let hasVideoUrl = false;
    let hasVideoUrlVertical = false;
    
    // Add horizontal image URL (from file upload or template)
    if (imageUrl) {
      insertData.image_url = imageUrl;
      insertData.storage_path = storagePathHorizontal;
      hasImageUrl = true;
    } else if (templateImageUrl) {
      insertData.image_url = templateImageUrl;
      hasImageUrl = true;
    }
    
    // Add vertical image URL (from file upload or template)
    if (imageUrlVertical) {
      insertData.image_url_vertical = imageUrlVertical;
      insertData.storage_path_vertical = storagePathVertical;
      hasImageUrlVertical = true;
    } else if (templateImageVerticalUrl) {
      insertData.image_url_vertical = templateImageVerticalUrl;
      hasImageUrlVertical = true;
    }
    
    // Add horizontal video URL (from file upload or template)
    if (videoUrl) {
      insertData.video_url = videoUrl;
      insertData.storage_path_video = storagePathVideoHorizontal;
      hasVideoUrl = true;
    } else if (templateVideoUrl) {
      insertData.video_url = templateVideoUrl;
      hasVideoUrl = true;
    }
    
    // Add vertical video URL (from file upload or template)
    if (videoUrlVertical) {
      insertData.video_url_vertical = videoUrlVertical;
      insertData.storage_path_video_vertical = storagePathVideoVertical;
      hasVideoUrlVertical = true;
    } else if (templateVideoVerticalUrl) {
      insertData.video_url_vertical = templateVideoVerticalUrl;
      hasVideoUrlVertical = true;
    }
    
    // If no horizontal image is provided, but we have vertical image, use it as fallback for image_url
    if (!hasImageUrl && hasImageUrlVertical) {
      insertData.image_url = insertData.image_url_vertical;
      console.log('Using vertical image as fallback for image_url');
    }
    
    // If no image at all, but we have video, create a placeholder
    if (!hasImageUrl && !hasImageUrlVertical && (hasVideoUrl || hasVideoUrlVertical)) {
      insertData.image_url = hasVideoUrl ? insertData.video_url : insertData.video_url_vertical;
      console.log('Using video URL as fallback for image_url');
    }
    
    // Final check: ensure we have at least image_url
    if (!insertData.image_url) {
      return NextResponse.json({
        success: false,
        error: 'Au moins une image (horizontale ou verticale) est requise'
      }, { status: 400 });
    }
    
    console.log('Insert data prepared:', insertData);
    
    const { data: backgroundData, error: insertError } = await supabaseAdmin
      .from('backgrounds')
      .insert(insertData)
      .select();
    
    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${insertError.message}`
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: backgroundData
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 });
  }
}
