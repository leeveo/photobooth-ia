import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => req.cookies });
    const { id } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID manquant' }), { status: 400 });
    }

    // Supprimer l'entrée dans la table photobooth_logo
    const { error } = await supabase
      .from('photobooth_logo')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Logo supprimé avec succès.' }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
