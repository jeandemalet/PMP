import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour la mise à jour des métadonnées
const updateMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  tags: z.string().optional(),
});

// GET /api/images/[id]/metadata - Récupérer les métadonnées d'une image
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

    const imageId = params.id;

    // Récupérer l'image avec ses métadonnées
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        alt: true,
        caption: true,
        tags: true,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ metadata: image }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/images/[id]/metadata - Mettre à jour les métadonnées d'une image
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

    const imageId = params.id;
    const body = await request.json();
    const { title, description, alt, caption, tags } = updateMetadataSchema.parse(body);

    // Vérifier que l'image existe et appartient à l'utilisateur
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour les métadonnées
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(alt !== undefined && { alt }),
        ...(caption !== undefined && { caption }),
        ...(tags !== undefined && { tags }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        alt: true,
        caption: true,
        tags: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Métadonnées mises à jour avec succès',
        metadata: updatedImage,
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

    console.error('Erreur lors de la mise à jour des métadonnées:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/images/[id]/metadata - Supprimer les métadonnées d'une image
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

    const imageId = params.id;

    // Vérifier que l'image existe et appartient à l'utilisateur
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer les métadonnées (mettre à null)
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        title: null,
        description: null,
        alt: null,
        caption: null,
        tags: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        alt: true,
        caption: true,
        tags: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Métadonnées supprimées avec succès',
        metadata: updatedImage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression des métadonnées:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
