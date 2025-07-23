import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const body = await request.json();
    const { id, project_id, input_image_2, prompt } = body;
    
    if (!project_id || !input_image_2 || !prompt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Données incomplètes' 
      }, { status: 400 });
    }
    
    let result;
    
    // Vérifier si un ID est fourni (mise à jour) ou non (création)
    if (id) {
      // Vérifier d'abord si l'enregistrement existe
      const { data: existingData, error: checkError } = await supabase
        .from('photobooth_logo')
        .select('id')
        .eq('id', id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Erreur lors de la vérification:', checkError);
        return NextResponse.json({ 
          success: false, 
          error: `Erreur de vérification: ${checkError.message}` 
        }, { status: 500 });
      }
      
      // Si l'enregistrement n'existe pas, créer un nouveau
      if (!existingData) {
        console.log('ID fourni mais enregistrement non trouvé, création d\'un nouveau');
        
        const { data, error } = await supabase
          .from('photobooth_logo')
          .insert({
            project_id,
            input_image_2,
            prompt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Erreur lors de la création:', error);
          return NextResponse.json({ 
            success: false, 
            error: `Erreur de création: ${error.message}` 
          }, { status: 500 });
        }
        
        result = {
          id: data?.[0]?.id || id,
          project_id,
          input_image_2,
          prompt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } 
      // Sinon, mettre à jour l'enregistrement existant
      else {
        console.log('Mise à jour de l\'enregistrement existant:', id);
        
        const { error } = await supabase
          .from('photobooth_logo')
          .update({
            input_image_2,
            prompt,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (error) {
          console.error('Erreur lors de la mise à jour:', error);
          return NextResponse.json({ 
            success: false, 
            error: `Erreur de mise à jour: ${error.message}` 
          }, { status: 500 });
        }
        
        result = {
          id,
          project_id,
          input_image_2,
          prompt,
          updated_at: new Date().toISOString()
        };
      }
    } 
    // Création d'un nouvel enregistrement
    else {
      console.log('Création d\'un nouvel enregistrement');
      
      const { data, error } = await supabase
        .from('photobooth_logo')
        .insert({
          project_id,
          input_image_2,
          prompt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id');
        
      if (error) {
        console.error('Erreur lors de la création:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Erreur de création: ${error.message}` 
        }, { status: 500 });
      }
      
      result = {
        id: data?.[0]?.id,
        project_id,
        input_image_2,
        prompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration du logo enregistrée avec succès',
      data: result
    });
    
  } catch (err) {
    console.error('Erreur générale:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}
