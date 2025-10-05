import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour la mise à jour d'une publication
const updatePublicationSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET /api/publications/[id] - Récupérer une publication spécifique
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

    const publicationId = params.id;

    // Récupérer la publication avec ses images
    const publication = await prisma.publication.findFirst({
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

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ publication }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération de la publication:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/publications/[id] - Mettre à jour une publication
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

    const publicationId = params.id;
    const body = await request.json();
    const { name, description, scheduledAt } = updatePublicationSchema.parse(body);

    // Vérifier que la publication existe et appartient à l'utilisateur
    const publication = await prisma.publication.findFirst({
      where: {
        id: publicationId,
        userId,
      },
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour la publication
    const updatedPublication = await prisma.publication.update({
      where: { id: publicationId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
      },
      include: {
        _count: {
          select: {
            images: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Publication mise à jour avec succès',
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

    console.error('Erreur lors de la mise à jour de la publication:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/publications/[id] - Supprimer une publication
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

    const publicationId = params.id;

    // Vérifier que la publication existe et appartient à l'utilisateur
    const publication = await prisma.publication.findFirst({
      where: {
        id: publicationId,
        userId,
      },
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer la publication (les images seront supprimées en cascade)
    await prisma.publication.delete({
      where: { id: publicationId },
    });

    return NextResponse.json(
      { message: 'Publication supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la publication:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
