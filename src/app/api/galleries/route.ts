import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour la création d'une galerie
const createGallerySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/galleries - Récupérer toutes les galeries de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    console.log('🔍 API /api/galleries - Headers received:', {
      'x-user-id': request.headers.get('x-user-id'),
      'x-user-email': request.headers.get('x-user-email'),
      'x-user-role': request.headers.get('x-user-role'),
      'all-headers': Object.fromEntries(request.headers.entries())
    });

    if (!userId) {
      console.log('❌ API /api/galleries - No user ID found in headers');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('✅ API /api/galleries - User ID found:', userId);

    const galleries = await prisma.gallery.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            images: true,
          },
        },
        images: {
          take: 4, // Récupérer seulement les 4 premières images pour l'aperçu
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ galleries }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des galeries:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/galleries - Créer une nouvelle galerie
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
    const { name, description, color } = createGallerySchema.parse(body);

    // Créer la galerie
    const gallery = await prisma.gallery.create({
      data: {
        name,
        description: description || null,
        color: color || null,
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
        message: 'Galerie créée avec succès',
        gallery,
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

    console.error('Erreur lors de la création de la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
