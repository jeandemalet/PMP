// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`\n--- [Middleware Start] Path: ${pathname} ---`);

  // --- LOGGING POINT 1: VÉRIFIER LES VARIABLES D'ENVIRONNEMENT ---
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ FATAL: JWT_SECRET is UNDEFINED in middleware!');
  } else {
    // Affiche une partie du secret pour confirmer qu'il est chargé (sans l'exposer entièrement)
    console.log(`✅ JWT_SECRET is loaded. Starts with: [${jwtSecret.substring(0, 4)}...]`);
  }

  // Essayer d'abord le nom correct 'auth-token', puis fallback sur 'token' si nécessaire
  let token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value;

  // --- LOGGING POINT 2: VÉRIFIER LE COOKIE ---
  const allCookies = Object.fromEntries(request.cookies);
  console.log('🍪 All cookies received:', allCookies);
  if (!token) {
    console.log('🍪 Cookie "auth-token": ❌ Not found.');
    console.log('🍪 Available cookies:', Object.keys(allCookies));
  } else {
    console.log(`🍪 Cookie "auth-token": ✅ Found. Length: ${token.length}`);
    console.log(`🍪 Token preview: ${token.substring(0, 20)}...`);
  }

  const protectedPaths = ['/gallery', '/admin', '/sort', '/crop', '/description', '/calendar', '/publication', '/settings'];
  const protectedApiPaths = ['/api/galleries', '/api/images', '/api/publications', '/api/upload'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isProtectedApiPath = protectedApiPaths.some(path => pathname.startsWith(path));

  if (!isProtectedPath && !isProtectedApiPath) {
    console.log('-> Path is not protected. Allowing access.');
    console.log(`--- [Middleware End] ---`);
    return NextResponse.next();
  }

  console.log('-> Path IS PROTECTED. Starting verification...');

  if (!token) {
    console.log('-> No token for protected path. Redirecting to login.');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    console.log(`--- [Middleware End] ---`);
    return NextResponse.redirect(loginUrl);
  }

  // Utiliser une API route pour vérifier le token JWT
  try {
    console.log('-> Verifying token via API route...');

    // Créer une requête vers l'API de vérification JWT interne
    const verifyUrl = new URL('/api/auth/verify-jwt', request.url);
    verifyUrl.searchParams.set('token', token);

    const verifyResponse = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (verifyResponse.ok) {
      const { user } = await verifyResponse.json();
      console.log(`🎉 SUCCESS: JWT verified for user [${user.email}] (ID: ${user.id})`);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', user.id);
      requestHeaders.set('x-user-email', user.email);
      requestHeaders.set('x-user-role', user.role);

      console.log(`--- [Middleware End] ---`);
      console.log(`🔐 User headers set: x-user-id=${user.id}, x-user-email=${user.email}, x-user-role=${user.role}`);

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
    } else {
      console.log('-> Token verification failed via API');
      const errorText = await verifyResponse.text();
      console.log('-> API Error response:', errorText);
      throw new Error('Token verification failed');
    }

  } catch (error) {
    console.error('❌ FAILED: Token verification failed');
    console.error('-> Token received:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    console.log('-> Invalid token. Deleting cookie and redirecting to login.');

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');

    console.log(`--- [Middleware End] ---`);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
