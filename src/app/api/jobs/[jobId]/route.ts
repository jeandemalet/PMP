import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { imageQueue, zipQueue } from '@/lib/queue';
import { Job as BullMQJob } from 'bullmq';

// GET /api/jobs/[jobId] - Récupérer le statut d'un job générique
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const jobId = params.jobId;

    // 1. Récupérer le job depuis Prisma pour connaître son type
    const dbJob = await prisma.job.findUnique({
      where: { id: jobId, userId },
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
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 });
    }

    const queueJobId = (dbJob.data as any)?.queueJobId;
    if (!queueJobId) {
      // Si le job n'a pas encore d'ID de queue, retournez simplement son état de la DB
      return NextResponse.json({
        jobId: dbJob.id,
        type: dbJob.type,
        status: dbJob.status,
        createdAt: dbJob.createdAt.toISOString(),
        updatedAt: dbJob.updatedAt.toISOString(),
      }, { status: 200 });
    }

    let job: BullMQJob | undefined = undefined;
    let queue;

    // 2. Sélectionner la bonne file d'attente en fonction du type de job
    switch (dbJob.type) {
      case 'IMAGE_CROP':
      case 'IMAGE_RESIZE':
        queue = imageQueue;
        break;
      case 'ZIP_CREATE':
        queue = zipQueue;
        break;
      // Ajoutez d'autres types de jobs ici si nécessaire
      default:
        return NextResponse.json({ error: `Type de job inconnu: ${dbJob.type}` }, { status: 400 });
    }

    // 3. Récupérer le job depuis la bonne file d'attente BullMQ
    job = await queue.getJob(queueJobId);

    if (!job) {
      // Le job peut être terminé et retiré de la queue, mais son état dans la DB est la référence
      return NextResponse.json({
        jobId: dbJob.id,
        type: dbJob.type,
        status: dbJob.status, // Le statut final est dans la DB
        createdAt: dbJob.createdAt.toISOString(),
        updatedAt: dbJob.updatedAt.toISOString(),
      }, { status: 200 });
    }

    const state = await job.getState();
    const progress = job.progress;

    return NextResponse.json({
      jobId: dbJob.id,
      queueJobId,
      type: dbJob.type,
      status: dbJob.status, // Le statut de la DB est la source de vérité
      state, // État de BullMQ (ex: 'active', 'completed')
      progress,
      createdAt: dbJob.createdAt.toISOString(),
      updatedAt: dbJob.updatedAt.toISOString(),
      ...(job.returnvalue && { result: job.returnvalue }),
      ...(job.failedReason && { error: job.failedReason }),
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors de la récupération du statut du job:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
