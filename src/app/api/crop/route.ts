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

    // Créer la variante en base de données
    const variant = await prisma.imageVariant.create({
      data: {
        filename: `${image.filename.split('.')[0]}_crop_${Date.now()}.${outputFormat}`,
        path: '', // Sera mis à jour par le worker
        width: cropArea.width,
        height: cropArea.height,
        size: 0, // Sera mis à jour par le worker
        mimeType: `image/${outputFormat}`,
        variantType: 'crop',
        parameters: {
          cropArea,
          rotation,
          flipHorizontal,
          flipVertical,
          outputFormat,
          quality,
        },
        imageId,
        userId,
      },
    });

    // Ajouter le job à la file d'attente pour le traitement asynchrone
    await imageQueue.add('process-crop', {
      imageId,
      variantId: variant.id,
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

    return NextResponse.json(
      {
        message: 'Recadrage ajouté au traitement',
        variant: {
          id: variant.id,
          variantType: variant.variantType,
          width: variant.width,
          height: variant.height,
          createdAt: variant.createdAt,
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
