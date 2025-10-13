import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tokenManager } from '@/lib/token-manager';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { authLogger } from '@/lib/logger';

async function revertImpersonationHandler(request: AuthenticatedRequest) {
  const currentUser = request.user;

  try {
    // Vérifier si l'utilisateur actuel est en impersonation
    // (Cette information devrait être dans le token ou en base)
    const impersonatedBy = (currentUser as any).impersonatedBy;

    if (!impersonatedBy) {
      return NextResponse.json(
        { error: 'Aucune session d\'impersonation active' },
        { status: 400 }
      );
    }

    // Récupérer les informations de l'administrateur original
    const adminUser = await prisma.user.findUnique({
      where: { id: impersonatedBy },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Administrateur original non trouvé' },
        { status: 404 }
      );
    }

    // Créer un token pour revenir à l'administrateur
    const adminToken = tokenManager.generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    // Logger structuré pour la fin d'impersonation
    authLogger.info({
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
      impersonatedUserId: currentUser.id,
      impersonatedEmail: currentUser.email,
    }, 'Admin reverted impersonation session');

    return NextResponse.json({
      message: 'Retour à votre compte administrateur',
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    }, { status: 200 });

  } catch (error) {
    authLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      currentUserId: currentUser.id,
      currentEmail: currentUser.email,
    }, 'Impersonation revert failed');

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(revertImpersonationHandler);
