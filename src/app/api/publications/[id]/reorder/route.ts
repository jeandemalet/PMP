import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour la réorganisation des images
const reorderImagesSchema = z.object({
  imageOrders: z.array(z.object({
    imageId: z.string(),
    position: z.number().int().min(0),
  })).min(1, 'Au moins une image est requise'),
});

// POST /api/publications/[id]/reorder - Réorganiser les images d'une publication
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const publicationId = params.id;
    const body = await request.json();
    const { imageOrders } = reorderImagesSchema.parse(body);

    // Vérifier que la publication existe et appartient à l'utilisateur
    const publication = await prisma.publication.findFirst({
      where: {
        id: publicationId,
        userId,
      },
      include: {
        images: {
          select: {
            id: true,
            imageId: true,
            position: true,
          },
        },
      },
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que toutes les images appartiennent à la publication
    const publicationImageIds = publication.images.map(pi => pi.imageId);
    const requestedImageIds = imageOrders.map(order => order.imageId);

    const missingImages = requestedImageIds.filter(id => !publicationImageIds.includes(id));

    if (missingImages.length > 0) {
      return NextResponse.json(
        { error: 'Certaines images ne font pas partie de cette publication', missingImages },
        { status: 400 }
      );
    }

    // Vérifier que les positions sont uniques et consécutives
    const positions = imageOrders.map(order => order.position);
    const uniquePositions = new Set(positions);

    if (positions.length !== uniquePositions.size) {
      return NextResponse.json(
        { error: 'Les positions doivent être uniques' },
        { status: 400 }
      );
    }

    // Mettre à jour les positions des images
    const updatePromises = imageOrders.map(({ imageId, position }) => {
      return prisma.publicationImage.updateMany({
        where: {
          publicationId,
          imageId,
        },
        data: {
          position,
        },
      });
    });

    await Promise.all(updatePromises);

    // Récupérer la publication mise à jour
    const updatedPublication = await prisma.publication.findFirst({
      where: {
        id: publicationId,
        userId,
      },
      include: {
        _count: {
          select: {
            images: true,
          },
        },
        images: {
          include: {
            image: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                title: true,
                description: true,
                uploadedAt: true,
                width: true,
                height: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Ordre des images mis à jour avec succès',
        publication: updatedPublication,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur lors de la réorganisation des images:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
