import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';

// GET /api/images/[id] - Récupérer une image spécifique
export const GET = withAuth(async (req: AuthenticatedRequest, context) => {
  try {
    const { params } = context || {};
    const imageId = params?.id;

    if (!imageId) {
      return NextResponse.json({ error: 'ID d\'image manquant' }, { status: 400 });
    }

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId: req.user.id,
      },
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
            path: true,
            variantType: true,
            width: true,
            height: true,
            size: true,
            createdAt: true,
          },
        },
        publications: {
          include: {
            publication: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ image }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});
