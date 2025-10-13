import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authLogger } from '@/lib/logger';

// GET /api/admin/users - Récupérer tous les utilisateurs
export async function GET(request: NextRequest) {
  let userId = '';

  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    userId = request.headers.get('x-user-id') || '';

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    // Récupérer tous les utilisateurs avec leurs statistiques et stockage
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            galleries: true,
            images: true,
            publications: true,
          },
        },
        // Inclure les images pour calculer le stockage total
        images: {
          select: {
            size: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculer le stockage total pour chaque utilisateur
    const usersWithStorage = users.map(user => {
      const totalStorage = user.images.reduce((sum, image) => sum + image.size, 0);
      const { images, ...userWithoutImages } = user; // Exclure les détails des images

      return {
        ...userWithoutImages,
        totalStorage,
        _count: {
          ...userWithoutImages._count,
          images: user.images.length, // Conserver le nombre d'images
        },
      };
    });

    // Logger structuré pour l'accès admin
    authLogger.info({
      adminUserId: userId,
      adminEmail: request.headers.get('x-user-email'),
      usersCount: usersWithStorage.length,
    }, 'Admin accessed users list with storage statistics');

    return NextResponse.json({ users: usersWithStorage }, { status: 200 });
  } catch (error) {
    authLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      adminUserId: userId,
      userAgent: request.headers.get('user-agent'),
    }, 'Failed to retrieve users list for admin');

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
