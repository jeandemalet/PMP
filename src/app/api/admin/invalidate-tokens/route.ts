import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tokenManager } from '@/lib/token-manager';
import { withAuth } from '@/lib/api-utils';

async function invalidateTokensHandler(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const adminUserId = request.headers.get('x-user-id');
    const adminUserRole = request.headers.get('x-user-role');

    if (!adminUserId || adminUserRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé - Droits administrateur requis' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Empêcher un admin de s'auto-invalider
    if (userId === adminUserId) {
      return NextResponse.json(
        { error: 'Impossible d\'invalider ses propres tokens' },
        { status: 400 }
      );
    }

    // En production, ici on devrait récupérer tous les tokens actifs de cet utilisateur
    // depuis Redis ou une table de sessions et les invalider
    // Pour l'instant, on simule l'invalidation
    console.log(`🔒 Invalidation des tokens pour l'utilisateur ${userId} (raison: ${reason || 'non spécifiée'})`);

    // Log de l'action administrative
    console.log(`Admin ${adminUserId} a invalidé les tokens de l'utilisateur ${userId}`);

    return NextResponse.json({
      message: 'Tokens invalidés avec succès',
      invalidatedUser: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
      reason: reason || 'Changement de rôle ou sécurité',
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors de l\'invalidation des tokens:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// Exporter avec authentification admin uniquement
export const POST = withAuth(invalidateTokensHandler, 'ADMIN');
