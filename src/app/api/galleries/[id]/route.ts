import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour la mise à jour d'une galerie
const updateGallerySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/galleries/[id] - Récupérer une galerie spécifique
export async function GET(
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

    const galleryId = params.id;

    // Récupérer la galerie avec ses statistiques
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            images: true,
          },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ gallery }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération de la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/galleries/[id] - Mettre à jour une galerie
export async function PUT(
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

    const galleryId = params.id;
    const body = await request.json();
    const { name, description, color } = updateGallerySchema.parse(body);

    // Vérifier que la galerie existe et appartient à l'utilisateur
    const existingGallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        userId,
      },
    });

    if (!existingGallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour la galerie
    const updatedGallery = await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Galerie mise à jour avec succès',
        gallery: updatedGallery,
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

    console.error('Erreur lors de la mise à jour de la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/galleries/[id] - Supprimer une galerie
export async function DELETE(
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

    const galleryId = params.id;

    // Vérifier que la galerie existe et appartient à l'utilisateur
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        userId,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer la galerie (les images seront supprimées en cascade)
    await prisma.gallery.delete({
      where: { id: galleryId },
    });

    return NextResponse.json(
      { message: 'Galerie supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
