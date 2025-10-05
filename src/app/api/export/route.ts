import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { zipQueue } from '@/lib/queue';
import { z } from 'zod';

// Schéma de validation pour l'export
const exportSchema = z.object({
  publicationIds: z.array(z.string()).optional(),
  imageIds: z.array(z.string()).optional(),
  includeMetadata: z.boolean().default(true),
  archiveName: z.string().optional(),
});

// POST /api/export - Créer une archive ZIP
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
    const { publicationIds, imageIds, includeMetadata, archiveName } = exportSchema.parse(body);

    let imagesToExport: string[] = [];

    // Si des publications sont spécifiées, récupérer leurs images
    if (publicationIds && publicationIds.length > 0) {
      const publications = await prisma.publication.findMany({
        where: {
          id: { in: publicationIds },
          userId,
        },
        include: {
          images: {
            include: {
              image: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });

      // Extraire les IDs des images des publications
      for (const publication of publications) {
        for (const pubImage of publication.images) {
          imagesToExport.push(pubImage.image.id);
        }
      }
    }

    // Ajouter les images directement spécifiées
    if (imageIds && imageIds.length > 0) {
      imagesToExport.push(...imageIds);
    }

    // Supprimer les doublons
    imagesToExport = Array.from(new Set(imagesToExport));

    if (imagesToExport.length === 0) {
      return NextResponse.json(
        { error: 'Aucune image à exporter' },
        { status: 400 }
      );
    }

    // Vérifier que toutes les images existent et appartiennent à l'utilisateur
    const images = await prisma.image.findMany({
      where: {
        id: { in: imagesToExport },
        userId,
      },
    });

    if (images.length !== imagesToExport.length) {
      return NextResponse.json(
        { error: 'Certaines images sont introuvables' },
        { status: 400 }
      );
    }

    // Créer le nom de l'archive
    const finalArchiveName = archiveName || `export_${new Date().toISOString().split('T')[0]}_${Date.now()}.zip`;

    // Créer l'entrée dans la table Job de Prisma pour le suivi persistant
    const dbJob = await prisma.job.create({
      data: {
        type: 'ZIP_CREATE',
        status: 'PENDING',
        data: {
          imageIds: imagesToExport,
          archiveName: finalArchiveName,
          includeMetadata,
          imageCount: images.length,
        },
        userId,
      },
    });

    // Ajouter le job à la queue avec l'ID du job Prisma
    const queueJob = await zipQueue.add('zip-create', {
      jobId: dbJob.id, // Référence vers le job Prisma
      imageIds: imagesToExport,
      archiveName: finalArchiveName,
      includeMetadata,
      userId,
    });

    // Mettre à jour le job avec l'ID BullMQ
    await prisma.job.update({
      where: { id: dbJob.id },
      data: {
        data: {
          ...dbJob.data as any,
          queueJobId: queueJob.id,
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Export ZIP démarré',
        jobId: dbJob.id, // Retourner l'ID Prisma plutôt que BullMQ
        queueJobId: queueJob.id, // Garder aussi l'ID BullMQ pour compatibilité
        archiveName: finalArchiveName,
        imageCount: images.length,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur lors du démarrage de l\'export:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// GET /api/export - Récupérer le statut des exports
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID requis' },
        { status: 400 }
      );
    }

    // D'abord récupérer le job depuis la base de données Prisma avec le CUID
    const dbJob = await prisma.job.findUnique({
      where: {
        id: jobId,
        userId, // S'assurer que l'utilisateur ne peut voir que ses propres jobs
      },
      select: {
        id: true,
        type: true,
        status: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbJob) {
      return NextResponse.json(
        { error: 'Job non trouvé' },
        { status: 404 }
      );
    }

    // Extraire l'ID du job BullMQ depuis les données du job Prisma
    const queueJobId = (dbJob.data as any)?.queueJobId;

    if (!queueJobId) {
      return NextResponse.json(
        { error: 'Job en file d\'attente non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer le statut du job depuis la queue BullMQ avec l'ID numérique
    const job = await zipQueue.getJob(queueJobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job en file d\'attente non trouvé' },
        { status: 404 }
      );
    }

    const state = await job.getState();
    const progress = job.progress;

    return NextResponse.json({
      jobId: dbJob.id, // Retourner l'ID Prisma (CUID)
      queueJobId, // Inclure aussi l'ID BullMQ pour compatibilité
      type: dbJob.type,
      status: dbJob.status,
      state,
      progress,
      createdAt: dbJob.createdAt.toISOString(),
      updatedAt: dbJob.updatedAt.toISOString(),
      ...(job.returnvalue && { result: job.returnvalue }),
      ...(job.failedReason && { error: job.failedReason }),
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
