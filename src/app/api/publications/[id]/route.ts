import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

// Route PATCH pour mettre à jour une publication
export const PATCH = withAuth(async (req: AuthenticatedRequest, context) => {
  try {
    const { params } = context || {};
    const publicationId = params?.id;

    if (!publicationId) {
      return NextResponse.json({ error: 'ID de publication manquant' }, { status: 400 });
    }

    const result = updateSchema.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const publication = await prisma.publication.findFirst({
      where: { id: publicationId, userId: req.user.id },
    });

    if (!publication) {
      return NextResponse.json({ error: 'Publication non trouvée' }, { status: 404 });
    }

    const updatedPublication = await prisma.publication.update({
      where: { id: publicationId },
      data: {
        ...result.data,
        // Convertir la chaîne de date en objet Date si elle est fournie
        scheduledAt: result.data.scheduledAt !== undefined
          ? (result.data.scheduledAt ? new Date(result.data.scheduledAt) : null)
          : undefined,
      },
    });

    return NextResponse.json(updatedPublication);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la publication:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});
