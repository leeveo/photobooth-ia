import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const projectIds = searchParams.get('projectIds');
    
    if (!projectIds) {
      return NextResponse.json({ error: 'Project IDs are required' }, { status: 400 });
    }
    
    const projectIdArray = projectIds.split(',').map(id => id.trim());
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Requête optimisée pour compter toutes les images en une fois
    const { data, error } = await supabase
      .from('sessions')
      .select('project_id')
      .in('project_id', projectIdArray)
      .not('result_s3_url', 'is', null)
      .not('result_image_url', 'is', null);
    
    if (error) {
      console.error('Error fetching image counts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Compter manuellement les occurrences par projet_id
    const photoCounts = {};
    projectIdArray.forEach(id => photoCounts[id] = 0);
    
    data?.forEach(session => {
      if (photoCounts[session.project_id] !== undefined) {
        photoCounts[session.project_id]++;
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      data: photoCounts 
    });
    
  } catch (err) {
    console.error('Error in get-projects-images-count:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err.message 
    }, { status: 500 });
  }
}
