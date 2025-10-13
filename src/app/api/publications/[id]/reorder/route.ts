import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { z } from 'zod';

const reorderSchema = z.object({
  imageOrders: z.array(z.object({
    imageId: z.string(),
    position: z.number().int(),
  })),
});

// POST /api/publications/[id]/reorder - Réorganiser les images d'une publication
export const POST = withAuth(async (req: AuthenticatedRequest, context) => {
  const { params } = context || {};
  const publicationId = params?.id;

  if (!publicationId) {
    return NextResponse.json({ error: 'ID de publication manquant' }, { status: 400 });
  }

  try {

    const body = await req.json();
    const { imageOrders } = reorderSchema.parse(body);

    const publication = await prisma.publication.findFirst({
      where: { id: publicationId, userId: req.user.id },
    });

    if (!publication) {
      return NextResponse.json({ error: 'Publication non trouvée ou accès non autorisé' }, { status: 404 });
    }

    // Utiliser une transaction pour s'assurer que toutes les mises à jour réussissent ou échouent ensemble
    const updateTransactions = imageOrders.map(order =>
      prisma.publicationImage.updateMany({
        where: {
          publicationId: publicationId,
          imageId: order.imageId,
        },
        data: {
          position: order.position,
        },
      })
    );

    await prisma.$transaction(updateTransactions);

    return NextResponse.json({ message: 'Ordre mis à jour avec succès' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error(`Erreur lors de la réorganisation de la publication ${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});
