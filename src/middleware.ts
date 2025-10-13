// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { tokenManager } from '@/lib/token-manager';
import { authLogger, errorLogger } from '@/lib/logger';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Essayer d'abord le nom correct 'auth-token', puis fallback sur 'token' si nécessaire
  let token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value;

  const protectedPaths = ['/gallery', '/admin', '/sort', '/crop', '/description', '/calendar', '/publication', '/settings'];
  const protectedApiPaths = ['/api/galleries', '/api/images', '/api/publications', '/api/upload'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isProtectedApiPath = protectedApiPaths.some(path => pathname.startsWith(path));

  if (!isProtectedPath && !isProtectedApiPath) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Vérifier d'abord si le token est dans la blocklist
    const isBlacklisted = await tokenManager.isTokenBlacklisted(token);
    if (isBlacklisted) {
      authLogger.warn({
        tokenLength: token.length,
        path: pathname,
        userAgent: request.headers.get('user-agent'),
      }, 'Blocked token detected, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('auth-token');
      return response;
    }

    // 2. Vérifier et décoder le token
    const decoded = tokenManager.verifyToken(token);
    if (!decoded) {
      throw new Error('Token invalide ou expiré');
    }

    // 3. Vérifier que l'utilisateur existe toujours et récupérer ses informations à jour
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // 4. Vérifier que le rôle dans le token correspond toujours au rôle en base
    if (decoded.role !== user.role) {
      authLogger.warn({
        userId: user.id,
        email: user.email,
        oldRole: decoded.role,
        newRole: user.role,
        path: pathname,
      }, 'User role changed, invalidating token');
      // Ajouter l'ancien token à la blocklist
      await tokenManager.blacklistToken(token);

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('auth-token');
      return response;
    }

    // Créer les headers utilisateur avec toutes les informations nécessaires
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-email', user.email);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-name', user.name || '');
    requestHeaders.set('x-user-created-at', user.createdAt.toISOString());

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });

  } catch (error) {
    errorLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: pathname,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    }, 'Middleware authentication failed');

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');

    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
