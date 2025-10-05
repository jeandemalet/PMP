import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { imageQueue } from '@/lib/queue';
import { z } from 'zod';

// Schéma de validation pour le smart crop
const smartCropSchema = z.object({
  imageId: z.string(),
  targetWidth: z.number().min(1).max(4000).default(800),
  targetHeight: z.number().min(1).max(4000).default(600),
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
    const { imageId, targetWidth, targetHeight } = smartCropSchema.parse(body);

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

    // Créer un job smart-crop dans la file d'attente
    const job = await imageQueue.add('smart-crop', {
      imageId,
      targetWidth,
      targetHeight,
      userId,
    });

    return NextResponse.json(
      {
        message: 'Smart crop démarré',
        jobId: job.id,
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

    console.error('Erreur lors du démarrage du smart crop:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
