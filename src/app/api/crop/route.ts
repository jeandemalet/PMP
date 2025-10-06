import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { imageQueue } from '@/lib/queue';
import { z } from 'zod';

// Schéma de validation pour le recadrage
const cropSchema = z.object({
  imageId: z.string().min(1, 'L\'ID de l\'image est requis'),
  cropArea: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  rotation: z.number().optional().default(0),
  flipHorizontal: z.boolean().optional().default(false),
  flipVertical: z.boolean().optional().default(false),
  outputFormat: z.enum(['jpeg', 'png', 'webp']).optional().default('jpeg'),
  quality: z.number().min(1).max(100).optional().default(90),
});

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
    const {
      imageId,
      cropArea,
      rotation = 0,
      flipHorizontal = false,
      flipVertical = false,
      outputFormat = 'jpeg',
      quality = 90,
    } = cropSchema.parse(body);

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

    // Créer d'abord le job dans la base de données pour tracking
    const job = await prisma.job.create({
      data: {
        type: 'IMAGE_CROP',
        status: 'PENDING',
        data: {
          imageId,
          cropArea,
          rotation,
          flipHorizontal,
          flipVertical,
          outputFormat,
          quality,
        },
        userId,
      },
    });

    // Ajouter le job à la file d'attente pour le traitement asynchrone
    await imageQueue.add('process-crop', {
      imageId,
      prismaJobId: job.id, // Inclure l'ID Prisma pour le tracking
      userId,
      operations: {
        crop: cropArea,
        rotate: rotation,
        flipHorizontal,
        flipVertical,
        format: outputFormat,
        quality,
      },
    });

    // Le statut reste PENDING - le worker le passera à PROCESSING quand il commencera le travail

    return NextResponse.json(
      {
        message: 'Recadrage ajouté au traitement',
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
        },
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

    console.error('Erreur lors du recadrage:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
