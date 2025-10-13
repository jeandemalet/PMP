import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    // Récupérer le token depuis les cookies pour l'ajouter à la blocklist
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      // Ajouter le token à la blocklist pour l'invalider immédiatement
      await tokenManager.blacklistToken(token);
      console.log('🔒 Token ajouté à la blocklist lors de la déconnexion');
    }

    // Créer la réponse de déconnexion
    const response = NextResponse.json(
      { message: 'Déconnexion réussie' },
      { status: 200 }
    );

    // Supprimer le cookie d'authentification
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immédiatement
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
