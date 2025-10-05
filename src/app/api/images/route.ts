import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/images - Récupérer toutes les images de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const galleryId = searchParams.get('galleryId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construire la condition where
    const where: any = { userId };

    if (galleryId) {
      where.galleryId = galleryId;
    }

    const images = await prisma.image.findMany({
      where,
      include: {
        gallery: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          select: {
            id: true,
            filename: true,
            width: true,
            height: true,
            size: true,
            variantType: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.image.count({
      where,
    });

    return NextResponse.json({
      images,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des images:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
