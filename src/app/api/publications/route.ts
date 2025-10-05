import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour la création d'une publication
const createPublicationSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET /api/publications - Récupérer toutes les publications de l'utilisateur
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

    const publications = await prisma.publication.findMany({
      where: { userId },
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
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ publications }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des publications:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/publications - Créer une nouvelle publication
export async function POST(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, scheduledAt } = createPublicationSchema.parse(body);

    // Créer la publication
    const publication = await prisma.publication.create({
      data: {
        name,
        description: description || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        userId,
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
        message: 'Publication créée avec succès',
        publication,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur lors de la création de la publication:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
