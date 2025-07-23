import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if project exists and is active
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, slug, is_active, photobooth_type')
      .eq('slug', slug)
      .single();
      
    if (error) {
      console.error('Error checking project:', error);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    if (!data.is_active) {
      return NextResponse.json({ error: 'Project is inactive' }, { status: 403 });
    }
    
    // Check if the photobooth type is 'logo'
    if (data.photobooth_type !== 'logo') {
      return NextResponse.json({ 
        error: 'Invalid project type',
        expectedType: 'logo',
        actualType: data.photobooth_type
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      project: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        type: data.photobooth_type
      }
    });
  } catch (error) {
    console.error('Exception in check-project API:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
