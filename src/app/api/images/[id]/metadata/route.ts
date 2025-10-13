import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { z } from 'zod';

const metadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

// PUT /api/images/[id]/metadata - Mettre à jour les métadonnées d'une image
export const PUT = withAuth(async (req: AuthenticatedRequest, context) => {
  const { params } = context || {};
  const imageId = params?.id;

  if (!imageId) {
    return NextResponse.json({ error: 'ID d\'image manquant' }, { status: 400 });
  }

  try {

    const body = await req.json();
    const data = metadataSchema.parse(body);

    const image = await prisma.image.findFirst({
      where: { id: imageId, userId: req.user.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image non trouvée ou accès non autorisé' }, { status: 404 });
    }

    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data,
    });

    return NextResponse.json({ metadata: updatedImage }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error(`Erreur lors de la mise à jour des métadonnées pour l'image ${imageId}:`, error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});
