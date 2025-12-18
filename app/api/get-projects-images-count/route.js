import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Créer un client Supabase avec la clé service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, { ...options, signal: AbortSignal.timeout(4000) }); // Timeout 4s
      }
    }
  }
);

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const projectIds = searchParams.get('projectIds');
    
    if (!projectIds) {
      return NextResponse.json({ error: 'Project IDs are required' }, { status: 400 });
    }
    
    const projectIdArray = projectIds.split(',').map(id => id.trim());
    
    // Initialiser les compteurs à 0
    const photoCounts = {};
    projectIdArray.forEach(id => photoCounts[id] = 0);
    
    // Exécuter les comptages en parallèle avec Promise.allSettled pour ne pas bloquer si un échoue
    const countPromises = projectIdArray.map(async (projectId) => {
      try {
        // Utiliser une requête RPC si disponible, sinon count classique
        const { count, error } = await supabaseAdmin
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .not('result_s3_url', 'is', null);
        
        if (!error && count !== null) {
          return { projectId, count };
        }
        return { projectId, count: 0 };
      } catch (err) {
        console.warn(`Timeout counting for ${projectId}`);
        return { projectId, count: 0 };
      }
    });
    
    const results = await Promise.allSettled(countPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        photoCounts[result.value.projectId] = result.value.count;
      }
    });
    
    console.log('📊 Photo counts:', photoCounts);
    
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
