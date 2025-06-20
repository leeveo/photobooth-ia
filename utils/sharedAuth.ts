import { createClient } from '@supabase/supabase-js';
import { serialize, parse } from 'cookie';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Créer client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Générer un token partagé avec TTL (durée de vie)
export const generateSharedToken = async (userId: string): Promise<string | null> => {
  try {
    // Créer un payload simple avec userId et timestamp
    const payload = {
      userId,
      timestamp: Date.now(),
      // Expiration: 7 jours
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    };
    
    // Encoder en base64
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return token;
  } catch (error) {
    console.error('Erreur génération token partagé:', error);
    return null;
  }
};

// Définir le cookie d'authentification partagée
export const setSharedAuthCookie = (res: NextResponse, token: string) => {
  // Définir le cookie accessible par les deux applications
// ...dans setSharedAuthCookie
res.cookies.set('shared_auth_token', token, {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7,
  domain: process.env.NODE_ENV === 'production' ? '.waibooth.app' : undefined
});
};

// Vérifier le token partagé
export const verifySharedToken = async (token: string) => {
  try {
    // Décoder le token
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Vérifier l'expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expiré
    }
    
    // Chercher l'utilisateur dans la base de données
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', payload.userId)
      .single();
    
    if (error) throw error;
    
    return user;
  } catch (error) {
    console.error('Erreur vérification token:', error);
    return null;
  }
};
