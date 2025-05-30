import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Cette clé secrète devrait être une chaîne complexe définie dans votre .env.local
const ADMIN_SECRET_KEY = 'votre_clé_secrète_très_complexe';  // À remplacer par une valeur dans .env

export async function POST(request) {
  try {
    const { email, password, secretKey } = await request.json();

    // Vérification de sécurité
    if (secretKey !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Clé secrète non valide' },
        { status: 401 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Création de l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Confirme automatiquement l'email
    });

    if (authError) {
      throw authError;
    }

    // Création du profil admin
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: 'Administrateur',
        role: 'admin'
      });

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json(
      { message: 'Administrateur créé avec succès', userId: authData.user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
