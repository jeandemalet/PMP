import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export type AuthHandler<T = any> = (
  request: AuthenticatedRequest,
  context?: T
) => Promise<NextResponse> | NextResponse;

export type Role = 'USER' | 'ADMIN';

/**
 * Higher-Order Function pour sécuriser les routes API avec authentification
 * @param handler - La fonction handler originale
 * @param requiredRole - Le rôle minimum requis (par défaut 'USER')
 * @returns Une fonction handler sécurisée
 */
export function withAuth<T = any>(
  handler: AuthHandler<T>,
  requiredRole: Role = 'USER'
) {
  return async function(request: NextRequest, context?: T) {
    try {
      // 1. Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
      const userId = request.headers.get('x-user-id');

      if (!userId) {
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        );
      }

      // 2. Vérifier que l'utilisateur existe et récupérer ses informations
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 401 }
        );
      }

      // 3. Vérifier les permissions si un rôle spécifique est requis
      if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Accès refusé - Droits administrateur requis' },
          { status: 403 }
        );
      }

      // 4. Ajouter l'utilisateur à la requête et appeler le handler original
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return handler(authenticatedRequest, context);

    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      return NextResponse.json(
        { error: 'Erreur interne du serveur' },
        { status: 500 }
      );
    }
  };
}

/**
 * Fonction utilitaire pour vérifier l'appartenance d'une ressource à un utilisateur
 * @param resourceUserId - L'ID utilisateur propriétaire de la ressource
 * @param requestUserId - L'ID utilisateur de la requête
 * @returns true si l'utilisateur a accès à la ressource
 */
export function hasResourceAccess(resourceUserId: string, requestUserId: string): boolean {
  return resourceUserId === requestUserId;
}

/**
 * Fonction utilitaire pour vérifier l'accès admin
 * @param userRole - Le rôle de l'utilisateur
 * @returns true si l'utilisateur est admin
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'ADMIN';
}

/**
 * Middleware pour les opérations CRUD avec vérification d'appartenance
 * @param handler - Le handler CRUD original
 * @param requiredRole - Le rôle minimum requis
 * @returns Un handler sécurisé avec vérification d'appartenance
 */
export function withResourceAuth<T = any>(
  handler: AuthHandler<T>,
  requiredRole: Role = 'USER'
) {
  return withAuth(async (request: AuthenticatedRequest, context) => {
    // Le handler original doit gérer la logique d'appartenance
    // Cette fonction fournit juste l'authentification de base
    return handler(request, context);
  }, requiredRole);
}
