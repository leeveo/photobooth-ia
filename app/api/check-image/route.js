import { NextResponse } from 'next/server';

export async function GET(request) {
  // Get the image URL from the query parameter
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  
  if (!imageUrl) {
    return NextResponse.json({ success: false, error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    // Try to fetch the image to check if it exists
    const response = await fetch(imageUrl, { method: 'HEAD' });
    
    return NextResponse.json({
      success: true,
      url: imageUrl,
      exists: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      contentType: response.headers.get('content-type')
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      url: imageUrl,
      error: error.message
    }, { status: 500 });
  }
}
