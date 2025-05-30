import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // FFmpeg est désactivé pour Vercel
    return NextResponse.json({
      message: "La fonctionnalité d'ajout d'arrière-plan est temporairement désactivée en production.",
      success: false
    });
  } catch (error) {
    console.error('❌ Erreur background:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}