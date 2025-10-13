import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { tokenManager } from '@/lib/token-manager';
import { authLogger, errorLogger } from '@/lib/logger';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export async function POST(request: NextRequest) {
  let email = '';

  try {
    const body = await request.json();
    const { email: emailAddress, password } = loginSchema.parse(body);
    email = emailAddress; // Stocker l'email pour les logs d'erreur

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Créer le token JWT avec durée de vie réduite (1 heure)
    const token = tokenManager.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Créer la réponse avec le token dans un cookie sécurisé
    const response = NextResponse.json(
      {
        message: 'Connexion réussie',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Définir le cookie avec le token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true en production, false en développement
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Plus strict en production
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    });

    // Logger structuré pour l'authentification réussie
    authLogger.info({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenLength: token.length,
      cookieMaxAge: 60 * 60 * 24 * 7,
      environment: process.env.NODE_ENV,
    }, 'User login successful, authentication token generated');

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    // Logger structuré pour les erreurs d'authentification
    errorLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email: email, // Utiliser la variable email déclarée plus haut
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    }, 'Authentication error occurred');

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
