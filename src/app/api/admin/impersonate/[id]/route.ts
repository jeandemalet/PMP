// src/app/api/admin/impersonate/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { tokenManager } from '@/lib/token-manager';
import { authLogger } from '@/lib/logger';

async function impersonateUserHandler(
  request: AuthenticatedRequest,
  context?: { params: { id: string } }
) {
  if (!context?.params) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  // Vérifier que l'utilisateur connecté est admin
  if (request.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé - Droits administrateur requis' }, { status: 403 });
  }

  const targetUserId = context.params.id;
  const adminUserId = request.user.id;

  try {
    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur cible non trouvé' }, { status: 404 });
    }

    // Empêcher l'auto-impersonation
    if (targetUserId === adminUserId) {
      return NextResponse.json({ error: 'Impossible de s\'impersonner soi-même' }, { status: 400 });
    }

    // Créer un token d'impersonation avec le TokenManager
    const impersonationToken = tokenManager.generateToken({
      userId: targetUserId,
      email: targetUser.email,
      role: targetUser.role,
    });

    // Logger structuré pour l'impersonation
    authLogger.info({
      adminUserId: adminUserId,
      adminEmail: request.user.email,
      targetUserId: targetUserId,
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
    }, 'Admin started impersonation session');

    return NextResponse.json({
      message: 'Impersonation démarrée avec succès',
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
      expiresIn: '1h',
    }, { status: 200 });

  } catch (error) {
    authLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      adminUserId: adminUserId,
      targetUserId: targetUserId,
      userAgent: request.headers.get('user-agent'),
    }, 'Impersonation failed');

    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const POST = withAuth(impersonateUserHandler);
