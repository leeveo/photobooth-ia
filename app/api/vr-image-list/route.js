// Marquer comme dynamique pour éviter l'erreur de rendu statique
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ attention à la sécurité côté serveur
  );

  const { data, error } = await supabase
    .from('sessions')
    .select('result_s3_url, result_image_url')
    .eq('project_id', projectId)
    .is('moderation', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const images = data
    .map((img) => img.result_s3_url || img.result_image_url)
    .filter((url) => !!url);

  return NextResponse.json({ images });
}
