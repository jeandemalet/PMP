// src/app/api/jobs/[jobId]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';

async function getJobStatusHandler(
  request: AuthenticatedRequest,
  context?: { params: { jobId: string } }
) {
  if (!context?.params) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const { jobId } = context.params;
  const userId = request.user.id;

  try {
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: userId, // Sécurité : ne trouver que les jobs de l'utilisateur connecté
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 });
    }

    return NextResponse.json(job, { status: 200 });

  } catch (error) {
    console.error(`Erreur lors de la récupération du job ${jobId}:`, error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const GET = withAuth(getJobStatusHandler);
