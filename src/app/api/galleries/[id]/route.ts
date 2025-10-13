import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// Route PATCH pour mettre à jour une galerie
export const PATCH = withAuth(async (req: AuthenticatedRequest, context) => {
  try {
    const { params } = context || {};
    const galleryId = params?.id;

    if (!galleryId) {
      return NextResponse.json({ error: 'ID de galerie manquant' }, { status: 400 });
    }

    const result = updateSchema.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, userId: req.user.id },
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Galerie non trouvée' }, { status: 404 });
    }

    const updatedGallery = await prisma.gallery.update({
      where: { id: galleryId },
      data: result.data,
    });

    return NextResponse.json(updatedGallery);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la galerie:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});

// Route DELETE pour supprimer une galerie
export const DELETE = withAuth(async (req: AuthenticatedRequest, context) => {
  try {
    const { params } = context || {};
    const galleryId = params?.id;

    if (!galleryId) {
      return NextResponse.json({ error: 'ID de galerie manquant' }, { status: 400 });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, userId: req.user.id },
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Galerie non trouvée' }, { status: 404 });
    }

    await prisma.gallery.delete({ where: { id: galleryId } });

    return NextResponse.json({ message: 'Galerie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la galerie:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});
